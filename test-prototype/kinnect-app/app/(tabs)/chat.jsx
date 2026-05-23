// app/(tabs)/chat.jsx
import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getRooms, getUserById } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

function RoomRow({ room, userId, onPress }) {
  const [otherName, setOtherName] = useState(null);

  useEffect(() => {
    if (room.type !== 'dm') return;
    const otherId = (room.member_ids || []).find(id => id !== userId);
    if (!otherId) return;
    getUserById(otherId)
      .then(r => setOtherName(r.data?.display_name || 'Unknown'))
      .catch(() => setOtherName('Unknown'));
  }, [room.id, userId]);

  const displayName = room.type === 'dm'
    ? (otherName || '…')
    : (room.name || 'Group Chat');

  const initials = displayName === '…' ? '?' :
    displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const unread   = parseInt(room.unread_count) || 0;
  const avatarBg = room.type === 'group' ? colors.green : colors.peach;

  return (
    <TouchableOpacity style={s.row} onPress={onPress}>
      <View style={[s.avatar, { backgroundColor: avatarBg }]}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.info}>
        <View style={s.topRow}>
          <Text style={s.name} numberOfLines={1}>{displayName}</Text>
          {room.last_message_at && (
            <Text style={s.time}>
              {new Date(room.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <Text style={[s.preview, unread > 0 && s.previewUnread]} numberOfLines={1}>
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
}

export default function ChatList() {
  const { user } = useAuth();
  const router   = useRouter();
  const [rooms,   setRooms]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await getRooms();
      setRooms(res.data.rooms || []);
    } catch (err) {
      console.log('getRooms error:', err.message, err.response?.data);
    }
    setLoading(false);
  };

  // Refresh every time this tab comes into focus
  useFocusEffect(useCallback(() => { fetchRooms(); }, []));

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headline}>Chats</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      ) : rooms.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No chats yet</Text>
          <Text style={s.emptySub}>Tap a pin on the map to say hi 👋</Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <RoomRow
              room={item}
              userId={user?.id}
              onPress={() => router.push(`/chat/${item.id}`)}
            />
          )}
          refreshing={loading}
          onRefresh={fetchRooms}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.cream },
  header:       { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16,
                  borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#fff' },
  headline:     { fontSize: 36, fontWeight: '800', color: colors.ink },
  row:          { flexDirection: 'row', alignItems: 'center', padding: 16,
                  borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: '#fff' },
  avatar:       { width: 52, height: 52, borderRadius: 26, alignItems: 'center',
                  justifyContent: 'center', marginRight: 12 },
  avatarText:   { color: '#fff', fontWeight: '800', fontSize: 18 },
  info:         { flex: 1 },
  topRow:       { flexDirection: 'row', justifyContent: 'space-between',
                  alignItems: 'baseline', marginBottom: 3 },
  name:         { fontSize: 16, fontWeight: '700', color: colors.ink, flex: 1 },
  time:         { fontSize: 11, color: colors.ink3, fontFamily: 'monospace' },
  preview:      { fontSize: 14, color: colors.ink3 },
  previewUnread:{ fontWeight: '700', color: colors.ink },
  badge:        { backgroundColor: colors.green, borderRadius: 99, minWidth: 22, height: 22,
                  alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8 },
  badgeText:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  empty:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:    { fontSize: 18, fontWeight: '700', color: colors.ink2 },
  emptySub:     { fontSize: 14, color: colors.ink3, marginTop: 6 },
});