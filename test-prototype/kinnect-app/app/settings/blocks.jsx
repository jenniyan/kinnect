// app/settings/blocks.jsx
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getBlocks, unblockUser } from '../../services/api';
import { colors } from '../../constants/theme';

export default function BlockList() {
  const router = useRouter();
  const [blocks,     setBlocks]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [unblocking, setUnblocking] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBlocks();
        setBlocks(res.data ?? []);
      } catch {
        Alert.alert('Error', 'Could not load block list.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUnblock = (person) => {
    Alert.alert(
      `Unblock ${person.display_name || 'this person'}?`,
      "They'll be able to see you on the map and message you again.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock', style: 'destructive',
          onPress: async () => {
            setUnblocking(person.id);
            try {
              await unblockUser(person.id);
              setBlocks(b => b.filter(u => u.id !== person.id));
            } catch {
              Alert.alert('Error', 'Could not unblock. Try again.');
            } finally {
              setUnblocking(null);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={s.screen}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.headline}>Block list</Text>
      <Text style={s.sub}>
        Blocked people can't see you on the map or send you messages. They don't know they're blocked.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      ) : blocks.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>🚫</Text>
          <Text style={s.emptyTitle}>No one blocked</Text>
          <Text style={s.emptySub}>People you block won't appear on your map and can't see you.</Text>
        </View>
      ) : (
        <View style={s.list}>
          {blocks.map((person, i) => (
            <View key={String(person.id)}>
              {i > 0 && <View style={s.divider} />}
              <View style={s.row}>
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(person.display_name || person.email || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={s.info}>
                  <Text style={s.name}>{person.display_name || 'Anonymous'}</Text>
                  <Text style={s.email}>{person.email}</Text>
                </View>
                <TouchableOpacity
                  style={[s.unblockBtn, unblocking === person.id && s.btnDisabled]}
                  onPress={() => handleUnblock(person)}
                  disabled={unblocking === person.id}
                >
                  {unblocking === person.id
                    ? <ActivityIndicator color={colors.ink2} size="small" />
                    : <Text style={s.unblockText}>Unblock</Text>}
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  screen:      { flex: 1, backgroundColor: colors.cream, padding: 20, paddingTop: 60 },
  back:        { marginBottom: 16 },
  backText:    { color: colors.ink2, fontSize: 16 },
  headline:    { fontSize: 36, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  sub:         { fontSize: 14, color: colors.ink3, lineHeight: 20, marginBottom: 24, maxWidth: 320 },
  list:        { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
                 borderColor: colors.line, overflow: 'hidden' },
  divider:     { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  row:         { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar:      { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.cream2,
                 alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 17, fontWeight: '700', color: colors.ink2 },
  info:        { flex: 1 },
  name:        { fontSize: 15, fontWeight: '600', color: colors.ink },
  email:       { fontSize: 12, color: colors.ink3, marginTop: 2 },
  unblockBtn:  { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line,
                 borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  btnDisabled: { opacity: 0.5 },
  unblockText: { color: colors.ink2, fontWeight: '600', fontSize: 13 },
  empty:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon:   { fontSize: 48, marginBottom: 14 },
  emptyTitle:  { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  emptySub:    { fontSize: 14, color: colors.ink3, textAlign: 'center', lineHeight: 20 },
});
