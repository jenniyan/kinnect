// app/chat/[id].jsx
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMessages, getRoom, getUserById, createRoom } from '../../services/api';
import { connectChat, getChatSocket } from '../../services/socket';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function ChatThread() {
  const { id, withUserId, name } = useLocalSearchParams();
  const { user }  = useAuth();
  const router    = useRouter();
  const listRef   = useRef(null);
  const roomIdRef = useRef(null);

  const [room,      setRoom]      = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [members,   setMembers]   = useState({}); // { userId: { display_name, ... } }
  const [draft,     setDraft]     = useState('');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    bootstrap();
    return () => {
      getChatSocket()?.off('new_message');
      getChatSocket()?.off('read_receipt');
    };
  }, []);

  const bootstrap = async () => {
    try {
      // Resolve room ID — handle /chat/new case
      let rId = (id && id !== 'new') ? id : null;
      if (!rId && withUserId) {
        const res = await createRoom({ type: 'dm', member_ids: [withUserId] });
        rId = res.data.id;
      }
      if (!rId) { router.back(); return; }
      roomIdRef.current = rId;

      // Load room + message history in parallel
      const [roomRes, msgsRes] = await Promise.all([
        getRoom(rId),
        getMessages(rId, { limit: 40 }),
      ]);
      const roomData = roomRes.data;
      const msgs     = msgsRes.data.messages || [];
      setRoom(roomData);
      setMessages(msgs);

      // Fetch member profiles for sender names/avatars
      const memberIds = roomData.member_ids || [];
      const profiles  = {};
      await Promise.all(memberIds.map(async (mid) => {
        try {
          const r = await getUserById(mid);
          profiles[mid] = r.data;
        } catch {}
      }));
      setMembers(profiles);

      // Connect chat socket
      const socket = await connectChat(user.id);
      socket.emit('join_room', { room_id: rId });

      // Mark existing unread messages as read
      for (const msg of msgs) {
        if (msg.sender_id !== user.id) {
          socket.emit('read_receipt', {
            message_id: msg.id ?? msg.message_id,
            room_id: rId,
          });
        }
      }

      // Listen for new messages
      socket.on('new_message', (msg) => {
        if (msg.room_id !== rId) return;
        const msgId = msg.message_id ?? msg.id;
        setMessages(prev => {
          if (prev.some(m => (m.id ?? m.message_id) === msgId)) return prev;
          return [...prev, msg];
        });
        // Mark as read immediately if from someone else
        if (msg.sender_id !== user.id) {
          socket.emit('read_receipt', { message_id: msgId, room_id: rId });
        }
      });

      socket.on('read_receipt', ({ message_id }) => {
        setMessages(prev =>
          prev.map(m => (m.id ?? m.message_id) === message_id ? { ...m, read: true } : m)
        );
      });

    } catch (err) {
      console.log('[chat bootstrap error]', err.message, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    const content = draft.trim();
    if (!content || !roomIdRef.current) return;
    setDraft('');
    getChatSocket()?.emit('send_message', {
      room_id: roomIdRef.current,
      content,
    });
  };

  const isGroup = room?.type === 'group';

  const renderMessage = ({ item: msg, index }) => {
    const msgId  = msg.id ?? msg.message_id;
    const isMe   = msg.sender_id === user.id;
    const sender = members[msg.sender_id];
    const senderName = isMe ? 'You' : (sender?.display_name || 'Unknown');
    const initial    = senderName[0].toUpperCase();

    // Show sender name in group chats for the first message in a run
    const prev = messages[index - 1];
    const showSender = isGroup && !isMe && (!prev || prev.sender_id !== msg.sender_id);

    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        {/* Avatar — shown for others in group chats */}
        {isGroup && !isMe ? (
          <View style={[s.senderAvatar, showSender ? {} : s.senderAvatarHidden]}>
            <Text style={s.senderAvatarText}>{initial}</Text>
          </View>
        ) : null}

        <View style={s.msgContent}>
          {/* Sender name label */}
          {showSender && (
            <Text style={s.senderName}>{senderName}</Text>
          )}
          <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
            <Text style={[s.bubbleText, isMe && { color: '#fff' }]}>{msg.content}</Text>
          </View>
          {isMe && (
            <Text style={s.status}>{msg.read ? '✓✓' : '✓'}</Text>
          )}
        </View>
      </View>
    );
  };

  const displayName = isGroup
    ? (room?.name || 'Group Chat')
    : (members[Object.keys(members).find(id => id !== user.id)]?.display_name || name || 'Chat');

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerName} numberOfLines={1}>{displayName}</Text>
          {isGroup && room?.member_ids && (
            <Text style={s.headerSub}>{room.member_ids.length} members</Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <ActivityIndicator color={colors.green} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={m => m.id ?? m.message_id ?? String(Math.random())}
          renderItem={renderMessage}
          contentContainerStyle={s.msgList}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <Text style={s.emptyText}>No messages yet. Say something! 👋</Text>
          }
        />
      )}

      {/* Composer */}
      <View style={s.composer}>
        <TextInput
          style={s.input}
          placeholder={`Message ${displayName}`}
          placeholderTextColor={colors.ink3}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={send}
          returnKeyType="send"
          multiline
        />
        <TouchableOpacity
          style={[s.sendBtn, !draft.trim() && { opacity: 0.4 }]}
          onPress={send}
          disabled={!draft.trim()}
        >
          <Text style={s.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: colors.cream },
  header:            { flexDirection: 'row', alignItems: 'center', paddingTop: 60,
                       paddingHorizontal: 16, paddingBottom: 12,
                       borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#fff' },
  backBtn:           { marginRight: 12, padding: 4 },
  backText:          { fontSize: 22, color: colors.ink },
  headerCenter:      { flex: 1 },
  headerName:        { fontSize: 17, fontWeight: '700', color: colors.ink },
  headerSub:         { fontSize: 12, color: colors.ink3, marginTop: 1 },
  msgList:           { padding: 16, gap: 4, paddingBottom: 8 },
  emptyText:         { textAlign: 'center', color: colors.ink3, marginTop: 40, fontSize: 14 },
  msgRow:            { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 2 },
  msgRowMe:          { flexDirection: 'row-reverse' },
  senderAvatar:      { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.peach,
                       alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  senderAvatarHidden:{ opacity: 0 },
  senderAvatarText:  { color: '#fff', fontWeight: '700', fontSize: 11 },
  msgContent:        { maxWidth: '78%', gap: 2 },
  senderName:        { fontSize: 11, color: colors.ink3, fontWeight: '600', marginLeft: 2, marginBottom: 2 },
  bubble:            { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:          { backgroundColor: colors.green, borderBottomRightRadius: 4 },
  bubbleThem:        { backgroundColor: '#fff', borderBottomLeftRadius: 4,
                       borderWidth: 1, borderColor: colors.line },
  bubbleText:        { fontSize: 15, color: colors.ink, lineHeight: 21 },
  status:            { fontSize: 10, color: colors.ink3, textAlign: 'right' },
  composer:          { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8,
                       borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fff' },
  input:             { flex: 1, backgroundColor: colors.cream, borderRadius: 20,
                       paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
                       color: colors.ink, maxHeight: 100, borderWidth: 1, borderColor: colors.line },
  sendBtn:           { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green,
                       alignItems: 'center', justifyContent: 'center' },
  sendText:          { color: '#fff', fontSize: 18, fontWeight: '700' },
});