// app/(tabs)/profile.jsx
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { updateProfile, getUserTags } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors, catColor, catFor } from '../../constants/theme';

export default function Profile() {
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    getUserTags(user.id)
      .then(res => setTags(res.data?.tags ?? []))
      .catch(() => {});
  }, [user?.id]);

  const toggleAnonymous = async (val) => {
    try {
      await updateProfile({ is_anonymous: val });
      await refreshUser();
    } catch {}
  };

  const toggleVisible = async (val) => {
    try {
      await updateProfile({ location_visible: val });
      await refreshUser();
    } catch {}
  };

  if (!user) return null;

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.heroTop}>
          <Text style={s.heroLabel}>your profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} style={s.gearBtn}>
            <Text style={s.gearText}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <View style={s.heroRow}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(user.display_name || '?').charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={s.displayName}>{user.display_name || 'Anonymous'}</Text>
            <Text style={s.userId}>user · {user.id?.slice(0, 8)}</Text>
          </View>
        </View>
      </View>

      {/* Status card */}
      <View style={s.statusCard}>
        <View style={[s.dot, { backgroundColor: user.location_visible ? colors.green : colors.ink3 }]} />
        <Text style={s.statusText}>
          <Text style={{ fontWeight: '700' }}>{user.location_visible ? 'On the map' : 'Hidden'}</Text>
          {' · '}{user.is_anonymous ? 'anonymous mode' : 'with name'}
        </Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Text style={s.manageText}>Manage</Text>
        </TouchableOpacity>
      </View>

      {/* Bio */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionLabel}>Bio</Text>
          <TouchableOpacity onPress={() => router.push('/settings/edit-profile')}>
            <Text style={s.sectionAction}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={s.card}>
          <Text style={s.bioText}>{user.bio || 'No bio yet. Tap Edit to add one.'}</Text>
        </View>
      </View>

      {/* Interests */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Text style={s.sectionLabel}>Interests ({tags.length})</Text>
          <TouchableOpacity onPress={() => router.push('/settings/edit-tags')}>
            <Text style={s.sectionAction}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {tags.length === 0 ? (
          <TouchableOpacity onPress={() => router.push('/settings/edit-tags')} style={s.emptyTags}>
            <Text style={s.emptyTagsText}>Tap + Add to pick your interests</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.tagsWrap}>
            {tags.map(t => {
              const cat   = catFor(t.name);
              const color = catColor(cat);
              return (
                <View key={t.id} style={[s.tagChip, { borderColor: color, backgroundColor: color + '18' }]}>
                  <Text style={[s.tagChipText, { color }]}>{t.name}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Privacy toggles */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>Privacy</Text>
        <View style={s.card}>
          <View style={s.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>Anonymous mode</Text>
              <Text style={s.toggleSub}>Appear as a grey dot with no name</Text>
            </View>
            <Switch value={!!user.is_anonymous} onValueChange={toggleAnonymous}
              trackColor={{ true: colors.green }} thumbColor="#fff" />
          </View>
          <View style={[s.toggleRow, { borderTopWidth: 1, borderTopColor: colors.line, marginTop: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={s.toggleTitle}>Show me on the map</Text>
              <Text style={s.toggleSub}>If off, you can't see others either</Text>
            </View>
            <Switch value={!!user.location_visible} onValueChange={toggleVisible}
              trackColor={{ true: colors.green }} thumbColor="#fff" />
          </View>
        </View>
      </View>

      {/* Sign out */}
      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.cream },
  container:     { paddingBottom: 60 },
  hero:          { backgroundColor: colors.green700, paddingTop: 60, paddingHorizontal: 20, paddingBottom: 80 },
  heroTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel:     { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.7)' },
  gearBtn:       { padding: 6 },
  gearText:      { fontSize: 20 },
  heroRow:       { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 20 },
  avatar:        { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)',
                   alignItems: 'center', justifyContent: 'center' },
  avatarText:    { fontSize: 30, fontWeight: '800', color: '#fff' },
  displayName:   { fontSize: 28, fontWeight: '800', color: '#fff' },
  userId:        { fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  statusCard:    { margin: 16, marginTop: -40, backgroundColor: '#fff', borderRadius: 18, padding: 14,
                   flexDirection: 'row', alignItems: 'center', gap: 10,
                   shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  dot:           { width: 12, height: 12, borderRadius: 6 },
  statusText:    { flex: 1, fontSize: 14, color: colors.ink2 },
  manageText:    { color: colors.green, fontWeight: '700', fontSize: 13 },
  section:       { marginHorizontal: 16, marginBottom: 16 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  sectionLabel:  { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, color: colors.ink3, fontWeight: '700' },
  sectionAction: { color: colors.green, fontWeight: '700', fontSize: 13 },
  card:          { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  bioText:       { padding: 16, fontSize: 15, color: colors.ink2, lineHeight: 22 },
  tagsWrap:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emptyTags:     { padding: 16, backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
                   borderColor: colors.line, alignItems: 'center' },
  emptyTagsText: { fontSize: 14, color: colors.ink3 },
  tagChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5 },
  tagChipText:   { fontSize: 14, fontWeight: '600' },
  toggleRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  toggleTitle:   { fontSize: 15, fontWeight: '600', color: colors.ink },
  toggleSub:     { fontSize: 12, color: colors.ink3, marginTop: 2 },
  signOut:       { margin: 16, padding: 16, alignItems: 'center', borderRadius: 14,
                   borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  signOutText:   { color: colors.danger, fontWeight: '700', fontSize: 15 },
});