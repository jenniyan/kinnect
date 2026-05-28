// app/profile/[id].jsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserById, getUserTags, blockUser, createRoom } from '../../services/api';
import { colors, catColor, catFor, tintFor, shadeFor } from '../../constants/theme';

function TagWithSubs({ tag, subtags = [], cat }) {
  const color = catColor(cat || catFor(tag));
  return (
    <View style={[tw.row, { borderColor: color }]}>
      <View style={[tw.pill, { backgroundColor: color }]}>
        <Text style={tw.pillText}>{tag}</Text>
      </View>
      {subtags.length === 0 ? (
        <Text style={tw.noSpec}>no specifics</Text>
      ) : subtags.map(s => (
        <View key={s} style={[tw.sub, { backgroundColor: tintFor(color) }]}>
          <Text style={[tw.subText, { color: shadeFor(cat || catFor(tag)) }]}>#{s}</Text>
        </View>
      ))}
    </View>
  );
}


export default function PublicProfile() {
  const { id }  = useLocalSearchParams();
  const router  = useRouter();
  const [user,    setUser]    = useState(null);
  const [tags,    setTags]    = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [userRes, tagsRes] = await Promise.all([
          getUserById(id),
          getUserTags(id),
        ]);
        setUser(userRes.data);
        setTags(tagsRes.data?.tags ?? []);
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
    Alert.alert('Block user?', "They won't see you on the map or be able to message you.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: async () => {
        try { await blockUser(id); router.back(); } catch {}
      }},
    ]);
  };

  if (loading || !user) {
    return <View style={s.loading}><Text style={s.loadingText}>Loading…</Text></View>;
  }

  const isAnon   = user.is_anonymous;
  const name     = isAnon ? 'Anonymous' : (user.display_name || 'Unknown');
  const initials = isAnon ? '?' : name.charAt(0).toUpperCase();

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>

      {/* Avatar */}
      <View style={s.avatarWrap}>
        {!isAnon && user.avatar_url ? (
          <Image
            source={{ uri: user.avatar_url }}
            style={s.avatarImg}
          />
        ) : (
          <View style={[s.avatar, { backgroundColor: isAnon ? colors.ink3 : colors.green }]}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
        )}
        <Text style={s.displayName}>{name}</Text>
      </View>

      {/* Tags */}
      {/* Tags */}
{tags.length > 0 && (
  <View style={s.section}>
    <Text style={s.sectionLabel}>Interests ({tags.length})</Text>
    <View style={s.tagsList}>
      {tags.map(t => (
        <TagWithSubs
          key={t.id ?? t.name}
          tag={t.name}
          subtags={(t.subtags || []).map(s => s.name ?? s)}
          cat={t.category}
        />
      ))}
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


const tw = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5,
             backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 12,
             paddingVertical: 6, paddingLeft: 6, paddingRight: 10 },
  pill:    { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  pillText:{ color: '#fff', fontWeight: '600', fontSize: 12 },
  noSpec:  { fontSize: 11, color: colors.ink3, fontStyle: 'italic' },
  sub:     { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  subText: { fontSize: 11, fontWeight: '500' },
});

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.cream },
  container:     { padding: 24, paddingTop: 60, paddingBottom: 60 },
  loading:       { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  loadingText:   { color: colors.ink3, fontSize: 16 },
  back:          { marginBottom: 24 },
  backText:      { color: colors.ink2, fontSize: 16 },
  avatarWrap:    { alignItems: 'center', marginBottom: 32 },
  avatar:        { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarImg:     { width: 90, height: 90, borderRadius: 45, marginBottom: 12, borderWidth: 2, borderColor: colors.line },
  avatarText:    { fontSize: 38, fontWeight: '800', color: '#fff' },
  displayName:   { fontSize: 28, fontWeight: '800', color: colors.ink },
  section:       { marginBottom: 24 },
  sectionLabel:  { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
                   color: colors.ink3, fontWeight: '700', marginBottom: 10 },
  tagsList:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5 },
  tagChipText:   { fontSize: 14, fontWeight: '600' },
  actions:       { gap: 10 },
  btnPrimary:    { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  btnDanger:     { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                   borderWidth: 1, borderColor: colors.danger },
  btnDangerText: { color: colors.danger, fontWeight: '700', fontSize: 16 },
});