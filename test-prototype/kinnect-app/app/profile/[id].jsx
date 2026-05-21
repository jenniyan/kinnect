// app/profile/[id].jsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserById, blockUser, createRoom } from '../../services/api';
import { colors, catColor, catFor } from '../../constants/theme';

export default function PublicProfile() {
  const { id }  = useLocalSearchParams();
  const router  = useRouter();
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserById(id);
        setUser(res.data);
      } catch {
        Alert.alert('Error', 'Could not load profile.');
        router.back();
      }
      setLoading(false);
    })();
  }, [id]);

  const startChat = async () => {
    try {
      const res = await createRoom({ type: 'dm', member_ids: [id] });
      router.push(`/chat/${res.data.id}`);
    } catch {
      Alert.alert('Error', 'Could not start chat.');
    }
  };

  const block = async () => {
    Alert.alert('Block user?', 'They won\'t see you on the map or be able to message you.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: async () => {
        try { await blockUser(id); router.back(); } catch {}
      }},
    ]);
  };

  if (loading || !user) {
    return <View style={s.loading}><Text style={s.loadingText}>Loading…</Text></View>;
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={s.avatarWrap}>
        <View style={[s.avatar, { backgroundColor: user.is_anonymous ? colors.ink3 : colors.green }]}>
          <Text style={s.avatarText}>
            {user.is_anonymous ? '?' : (user.display_name || '?').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={s.displayName}>{user.is_anonymous ? 'Anonymous' : (user.display_name || 'Unknown')}</Text>
      </View>

      {/* Tags */}
      {user.tags?.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionLabel}>Interests</Text>
          <View style={s.tagsWrap}>
            {user.tags.map(t => {
              const cat   = catFor(t.name);
              const color = catColor(cat);
              return (
                <View key={t.name} style={[s.tagChip, { borderColor: color, backgroundColor: color + '18' }]}>
                  <Text style={[s.tagChipText, { color }]}>{t.name}</Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity style={s.btnPrimary} onPress={startChat}>
          <Text style={s.btnPrimaryText}>Say hi 👋</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnDanger} onPress={block}>
          <Text style={s.btnDangerText}>Block</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.cream },
  container:     { padding: 24, paddingTop: 60, paddingBottom: 60 },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  loadingText:   { color: colors.ink3, fontSize: 16 },
  back:          { marginBottom: 24 },
  backText:      { color: colors.ink2, fontSize: 16 },
  avatarWrap:    { alignItems: 'center', marginBottom: 32 },
  avatar:        { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText:    { fontSize: 38, fontWeight: '800', color: '#fff' },
  displayName:   { fontSize: 28, fontWeight: '800', color: colors.ink },
  section:       { marginBottom: 24 },
  sectionLabel:  { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
                   color: colors.ink3, fontWeight: '700', marginBottom: 10 },
  tagsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5 },
  tagChipText:   { fontSize: 14, fontWeight: '600' },
  actions:       { gap: 10 },
  btnPrimary:    { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDanger:     { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                   borderWidth: 1, borderColor: colors.danger },
  btnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});