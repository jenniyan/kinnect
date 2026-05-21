// app/chat/[id].jsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getMessages, getRoom } from '../../services/api';
import { connectChat, getChatSocket } from '../../services/socket';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function ChatThread() {
  const { id, withUserId, name } = useLocalSearchParams();
  const { user } = useAuth();
  const router   = useRouter();
  const listRef  = useRef(null);

  const [room,     setRoom]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft,    setDraft]    = useState('');
  const [typing,   setTyping]   = useState(false);
  const roomId = useRef(id);

  useEffect(() => {
    bootstrap();
    return () => {
      getChatSocket()?.off('new_message');
      getChatSocket()?.off('read_receipt');
    };
  }, []);

  const bootstrap = async () => {
    // If we have a room ID, load it. Otherwise create a DM first.
    let rId = id;
    if (!rId && withUserId) {
      const { createRoom } = await import('../../services/api');
      const res = await createRoom({ type: 'dm', member_ids: [withUserId] });
      rId = res.data.id;
      roomId.current = rId;
    }

    // Load room info + history
    const [roomRes, msgsRes] = await Promise.all([
      getRoom(rId),
      getMessages(rId, { limit: 40 }),
    ]);
    setRoom(roomRes.data);
    setMessages(msgsRes.data.messages || []);

    // Connect chat socket + join room
    const socket = await connectChat(user.id);
    socket.emit('join_room', { room_id: rId });

    socket.on('new_message', (msg) => {
      if (msg.room_id !== rId) return;
      setMessages(prev => [...prev, msg]);
      // Send read receipt
      socket.emit('read_receipt', { message_id: msg.message_id, room_id: rId });
    });

    socket.on('read_receipt', ({ message_id }) => {
      setMessages(prev => prev.map(m => m.id === message_id ? { ...m, read: true } : m));
    });
  };

  const send = () => {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    getChatSocket()?.emit('send_message', { room_id: roomId.current, content });
  };

  const renderMessage = ({ item: msg }) => {
    const isMe = msg.sender_id === user.id;
    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
          <Text style={[s.bubbleText, isMe && { color: '#fff' }]}>{msg.content}</Text>
        </View>
        {isMe && (
          <Text style={s.status}>{msg.read ? '✓✓' : '✓'}</Text>
        )}
      </View>
    );
  };

  const displayName = room?.name || name || 'Chat';

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerName} numberOfLines={1}>{displayName}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id || m.message_id || String(Math.random())}
        renderItem={renderMessage}
        contentContainerStyle={s.msgList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
      />

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
        <TouchableOpacity style={[s.sendBtn, !draft.trim() && { opacity: 0.4 }]} onPress={send} disabled={!draft.trim()}>
          <Text style={s.sendText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.cream },
  header:     { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 16,
                paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.cream },
  backBtn:    { marginRight: 12, padding: 4 },
  backText:   { fontSize: 22, color: colors.ink },
  headerName: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.ink },
  msgList:    { padding: 16, gap: 6 },
  msgRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  msgRowMe:   { flexDirection: 'row-reverse' },
  bubble:     { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe:   { backgroundColor: colors.green, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: colors.line },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  status:     { fontSize: 10, color: colors.ink3, marginBottom: 2 },
  composer:   { flexDirection: 'row', alignItems: 'flex-end', padding: 12, gap: 8,
                borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: '#fff' },
  input:      { flex: 1, backgroundColor: colors.cream, borderRadius: 20, paddingHorizontal: 16,
                paddingVertical: 10, fontSize: 15, color: colors.ink, maxHeight: 100,
                borderWidth: 1, borderColor: colors.line },
  sendBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.green,
                alignItems: 'center', justifyContent: 'center' },
  sendText:   { color: '#fff', fontSize: 18, fontWeight: '700' },
});
