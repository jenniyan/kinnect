// app/chat/[id].jsx
import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Linking,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getMessages,
  getRoom,
  getUserById,
  createRoom,
  addRoomMember,
  leaveRoom,
} from "../../services/api";
import { connectChat, getChatSocket } from "../../services/socket";
import { useAuth } from "../../services/auth";
import { colors } from "../../constants/theme";

// ── ChatInfoSheet ─────────────────────────────────────────────
function ChatInfoSheet({ room, members, onClose, router }) {
  const isGroup = room?.type === "group";
  const memberList = Object.values(members);

  const exportToPlatform = (platform) => {
    const urls = {
      instagram: "instagram://direct-inbox",
      discord: "discord://",
      whatsapp: "whatsapp://send",
    };
    Linking.openURL(urls[platform]).catch(() => {});
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ci.overlay} onPress={onClose}>
        <Pressable style={ci.sheet} onPress={() => {}}>
          <View style={ci.grab} />

          {/* Header */}
          <View style={ci.header}>
            <View
              style={[
                ci.avatar,
                { backgroundColor: isGroup ? colors.green : colors.peach },
              ]}
            >
              <Text style={ci.avatarText}>
                {(room?.name || "Chat")[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ci.name}>{room?.name || "Direct Message"}</Text>
              <Text style={ci.sub}>
                {isGroup
                  ? `${memberList.length} members · group`
                  : "direct message"}
              </Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Members */}
            <Text style={ci.sectionLabel}>members</Text>
            <View style={ci.card}>
              {memberList.map((m, i) => (
                <View
                  key={m.id}
                  style={[ci.memberRow, i > 0 && ci.memberBorder]}
                >
                  <View
                    style={[ci.memberAvatar, { backgroundColor: colors.green }]}
                  >
                    {m.avatar_url ? (
                      <Image
                        source={{ uri: m.avatar_url }}
                        style={ci.memberAvatarImg}
                      />
                    ) : (
                      <Text style={ci.memberAvatarText}>
                        {(m.display_name || "?")[0].toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <Text style={ci.memberName}>
                    {m.display_name || "Unknown"}
                  </Text>
                  {m._isMe ? (
                    <View style={ci.youBadge}>
                      <Text style={ci.youBadgeText}>you</Text>
                    </View>
                  ) : (
                    <View style={ci.nearbyBadge}>
                      <Text style={ci.nearbyBadgeText}>nearby</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* Export / open in */}
            <Text style={ci.sectionLabel}>continue on</Text>
            <View style={ci.exportRow}>
              <TouchableOpacity
                style={ci.exportBtn}
                onPress={() => exportToPlatform("instagram")}
              >
                <View style={[ci.exportIcon, { backgroundColor: "#E1306C" }]}>
                  <Text style={{ fontSize: 16 }}>📸</Text>
                </View>
                <Text style={ci.exportLabel}>Instagram DM</Text>
                <Text style={ci.exportArrow}>↗</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={ci.exportBtn}
                onPress={() => exportToPlatform("discord")}
              >
                <View style={[ci.exportIcon, { backgroundColor: "#5865F2" }]}>
                  <Text style={{ fontSize: 16 }}>🎮</Text>
                </View>
                <Text style={ci.exportLabel}>Discord</Text>
                <Text style={ci.exportArrow}>↗</Text>
              </TouchableOpacity>
            </View>

            {/* Danger zone */}
            <Text style={ci.sectionLabel}>danger zone</Text>
            <View style={ci.card}>
              <TouchableOpacity
                style={ci.dangerRow}
                onPress={async () => {
                  try {
                    await leaveRoom(room.id);
                    onClose();
                    router.replace("/(tabs)/chat");
                  } catch {
                    Alert.alert(
                      "Error",
                      "Could not leave conversation. Try again.",
                    );
                  }
                }}
              >
                <Text style={ci.dangerText}>Leave conversation</Text>
                <Text style={ci.dangerArrow}>→</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const ci = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(20,32,25,0.4)",
  },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 10,
    maxHeight: "80%",
  },
  grab: {
    width: 36,
    height: 4,
    backgroundColor: colors.line,
    borderRadius: 99,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontWeight: "800", fontSize: 22 },
  name: { fontSize: 22, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 13, color: colors.ink3, marginTop: 2 },
  sectionLabel: {
    fontFamily: "monospace",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: colors.ink3,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    marginBottom: 16,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  memberBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  memberAvatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  memberName: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink },
  youBadge: {
    backgroundColor: colors.green + "22",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  youBadgeText: { fontSize: 11, fontWeight: "700", color: colors.green },
  nearbyBadge: {
    backgroundColor: colors.cream,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.line,
  },
  nearbyBadgeText: { fontSize: 11, fontWeight: "600", color: colors.ink3 },
  exportRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  exportBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  exportIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exportLabel: { fontSize: 13, fontWeight: "600", color: colors.ink },
  exportArrow: { fontSize: 13, color: colors.ink3 },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dangerText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: colors.danger,
  },
  dangerArrow: { fontSize: 16, color: colors.danger },
});

// ── Main thread ───────────────────────────────────────────────
export default function ChatThread() {
  const { id, withUserId, name } = useLocalSearchParams();
  const { user } = useAuth();
  const router = useRouter();
  const listRef = useRef(null);
  const roomIdRef = useRef(null);

  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState({});
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    bootstrap();
    return () => {
      getChatSocket()?.off("new_message");
      getChatSocket()?.off("read_receipt");
    };
  }, []);

  const bootstrap = async () => {
    try {
      let rId = id && id !== "new" ? id : null;
      if (!rId && withUserId) {
        const res = await createRoom({ type: "dm", member_ids: [withUserId] });
        rId = res.data.id;
      }
      if (!rId) {
        router.back();
        return;
      }
      roomIdRef.current = rId;

      const [roomRes, msgsRes] = await Promise.all([
        getRoom(rId),
        getMessages(rId, { limit: 40 }),
      ]);
      const roomData = roomRes.data;
      const msgs = msgsRes.data.messages || [];
      setRoom(roomData);
      setMessages(msgs);

      const memberIds = roomData.member_ids || [];
      const profiles = {};
      await Promise.all(
        memberIds.map(async (mid) => {
          try {
            const r = await getUserById(mid);
            profiles[mid] = { ...r.data, _isMe: mid === user.id };
          } catch {}
        }),
      );
      setMembers(profiles);

      const socket = await connectChat(user.id);
      socket.emit("join_room", { room_id: rId });

      for (const msg of msgs) {
        if (msg.sender_id !== user.id) {
          socket.emit("read_receipt", {
            message_id: msg.id ?? msg.message_id,
            room_id: rId,
          });
        }
      }

      socket.on("new_message", (msg) => {
        if (msg.room_id !== rId) return;
        const msgId = msg.message_id ?? msg.id;
        setMessages((prev) => {
          if (prev.some((m) => (m.id ?? m.message_id) === msgId)) return prev;
          return [...prev, msg];
        });
        if (msg.sender_id !== user.id) {
          socket.emit("read_receipt", { message_id: msgId, room_id: rId });
        }
      });

      socket.on("read_receipt", ({ message_id }) => {
        setMessages((prev) =>
          prev.map((m) =>
            (m.id ?? m.message_id) === message_id ? { ...m, read: true } : m,
          ),
        );
      });
    } catch (err) {
      console.log("[chat bootstrap error]", err.message, err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  const send = () => {
    const content = draft.trim();
    if (!content || !roomIdRef.current) return;
    setDraft("");
    getChatSocket()?.emit("send_message", {
      room_id: roomIdRef.current,
      content,
    });
  };

  const isGroup = room?.type === "group";

  const displayName = isGroup
    ? room?.name || "Group Chat"
    : members[Object.keys(members).find((mid) => mid !== user.id)]
        ?.display_name ||
      name ||
      "Chat";

  const renderMessage = ({ item: msg, index }) => {
    const msgId = msg.id ?? msg.message_id;
    const isMe = msg.sender_id === user.id;
    const sender = members[msg.sender_id];
    const senderName = isMe ? "You" : sender?.display_name || "Unknown";
    const initial = senderName[0].toUpperCase();
    const prev = messages[index - 1];
    const showSender =
      isGroup && !isMe && (!prev || prev.sender_id !== msg.sender_id);

    return (
      <View style={[s.msgRow, isMe && s.msgRowMe]}>
        {isGroup && !isMe ? (
          <View
            style={[s.senderAvatar, showSender ? {} : s.senderAvatarHidden]}
          >
            {sender?.avatar_url ? (
              <Image
                source={{ uri: sender.avatar_url }}
                style={s.senderAvatarImg}
              />
            ) : (
              <Text style={s.senderAvatarText}>{initial}</Text>
            )}
          </View>
        ) : null}
        <View style={s.msgContent}>
          {showSender && <Text style={s.senderName}>{senderName}</Text>}
          <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
            <Text style={[s.bubbleText, isMe && { color: "#fff" }]}>
              {msg.content}
            </Text>
          </View>
          {isMe && <Text style={s.status}>{msg.read ? "✓✓" : "✓"}</Text>}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header — tap name to open info sheet */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.headerCenter}
          onPress={() => setShowInfo(true)}
        >
          <Text style={s.headerName} numberOfLines={1}>
            {displayName}
          </Text>
          {isGroup && room?.member_ids && (
            <Text style={s.headerSub}>
              {room.member_ids.length} members · tap for info
            </Text>
          )}
          {!isGroup && <Text style={s.headerSub}>tap for info</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={s.infoBtn} onPress={() => setShowInfo(true)}>
          <Text style={s.infoBtnText}>···</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ flex: 1 }} />
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id ?? m.message_id ?? String(Math.random())}
          renderItem={renderMessage}
          contentContainerStyle={s.msgList}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <Text style={s.emptyText}>No messages yet. Say something! 👋</Text>
          }
        />
      )}

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

      {showInfo && room && (
        <ChatInfoSheet
          room={room}
          members={members}
          onClose={() => setShowInfo(false)}
          router={router}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: "#fff",
  },
  backBtn: { marginRight: 8, padding: 4 },
  backText: { fontSize: 22, color: colors.ink },
  headerCenter: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: "700", color: colors.ink },
  headerSub: { fontSize: 11, color: colors.ink3, marginTop: 1 },
  infoBtn: { padding: 8, marginLeft: 4 },
  infoBtnText: { fontSize: 20, color: colors.ink3, letterSpacing: 2 },
  msgList: { padding: 16, gap: 4, paddingBottom: 8 },
  emptyText: {
    textAlign: "center",
    color: colors.ink3,
    marginTop: 40,
    fontSize: 14,
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: 2,
  },
  msgRowMe: { flexDirection: "row-reverse" },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.peach,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  senderAvatarHidden: { opacity: 0 },
  senderAvatarImg: { width: 28, height: 28, borderRadius: 14 },
  senderAvatarText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  msgContent: { maxWidth: "78%", gap: 2 },
  senderName: {
    fontSize: 11,
    color: colors.ink3,
    fontWeight: "600",
    marginLeft: 2,
    marginBottom: 2,
  },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMe: { backgroundColor: colors.green, borderBottomRightRadius: 4 },
  bubbleThem: {
    backgroundColor: "#fff",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  status: { fontSize: 10, color: colors.ink3, textAlign: "right" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: "#fff",
  },
  input: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.ink,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.line,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
