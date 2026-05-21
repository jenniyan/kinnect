// app/(tabs)/chat.jsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { getRooms } from '../../services/api';
import { colors } from '../../constants/theme';

export default function ChatList() {
  const router = useRouter();
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await getRooms();
      setRooms(res.data.rooms || []);
    } catch {}
    setLoading(false);
  };

  const renderRoom = ({ item: room }) => {
    const initials = (room.name || 'GC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const unread   = parseInt(room.unread_count) || 0;
    return (
      <TouchableOpacity style={s.row} onPress={() => router.push(`/chat/${room.id}`)}>
        <View style={[s.avatar, { backgroundColor: room.type === 'group' ? colors.green : colors.peach }]}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <View style={s.info}>
          <View style={s.topRow}>
            <Text style={s.name} numberOfLines={1}>{room.name || 'Direct Message'}</Text>
            {room.last_message_at && (
              <Text style={s.time}>{new Date(room.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            )}
          </View>
          <Text style={[s.preview, unread > 0 && { fontWeight: '700', color: colors.ink }]} numberOfLines={1}>
            {room.last_message || 'No messages yet'}
          </Text>
        </View>
        {unread > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{unread}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headline}>Chats</Text>
        <Text style={s.sub}>socket.io · real-time</Text>
      </View>

      <View style={s.searchBar}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput style={s.searchInput} placeholder="Search messages" placeholderTextColor={colors.ink3} />
      </View>

      {loading ? (
        <View style={s.empty}><Text style={s.emptyText}>Loading…</Text></View>
      ) : rooms.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No chats yet</Text>
          <Text style={s.emptySub}>Tap a pin on the map to say hi</Text>
        </View>
      ) : (
        <FlatList data={rooms} keyExtractor={r => r.id} renderItem={renderRoom}
          refreshing={loading} onRefresh={fetchRooms} />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.cream },
  header:     { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 8 },
  headline:   { fontSize: 36, fontWeight: '800', color: colors.ink },
  sub:        { fontFamily: 'monospace', fontSize: 11, color: colors.ink3, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, margin: 16,
                marginTop: 8, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line },
  searchIcon: { fontSize: 14, marginRight: 8 },
  searchInput:{ flex: 1, paddingVertical: 12, fontSize: 15, color: colors.ink },
  row:        { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar:     { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  info:       { flex: 1 },
  topRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  name:       { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 },
  time:       { fontSize: 11, color: colors.ink3, fontFamily: 'monospace' },
  preview:    { fontSize: 14, color: colors.ink3 },
  badge:      { backgroundColor: colors.peach, borderRadius: 99, width: 22, height: 22,
                alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  badgeText:  { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:  { fontSize: 18, fontWeight: '700', color: colors.ink2 },
  emptySub:   { fontSize: 14, color: colors.ink3, marginTop: 6 },
});
