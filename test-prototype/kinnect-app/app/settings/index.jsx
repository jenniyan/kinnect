// app/settings/index.jsx
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../services/auth';
import { getUserTags } from '../../services/api';
import { colors } from '../../constants/theme';

export default function Settings() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (!user?.id) return;
    getUserTags(user.id)
      .then(res => {
        console.log('settings getUserTags:', JSON.stringify(res.data));
        setTags(res.data?.tags ?? []);
      })
      .catch(err => console.log('settings tags error:', err.message));
  }, [user?.id]);

  const Row = ({ icon, title, detail, onPress, last }) => (
    <TouchableOpacity style={[s.row, !last && s.rowBorder]} onPress={onPress}>
      <Text style={s.rowIcon}>{icon}</Text>
      <Text style={s.rowTitle}>{title}</Text>
      <Text style={s.rowDetail}>{detail} {'›'}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.headline}>Settings</Text>
      <Text style={s.email}>
        Logged in as{' '}
        <Text style={{ color: colors.ink, fontWeight: '700' }}>{user?.email}</Text>
      </Text>

      <Text style={s.groupLabel}>Privacy</Text>
      <View style={s.group}>
        <Row icon="👻" title="Anonymous mode"    detail={user?.is_anonymous     ? 'On'  : 'Off'}    onPress={() => router.push('/settings/privacy')} />
        <Row icon="👁"  title="Show on map"       detail={user?.location_visible ? 'Yes' : 'Hidden'} onPress={() => router.push('/settings/privacy')} />
        <Row icon="🚫" title="Block list"         detail=""                                           onPress={() => router.push('/settings/blocks')} last />
      </View>

      <Text style={s.groupLabel}>Connect</Text>
      <View style={s.group}>
        <Row icon="🔗" title="Linked accounts" detail={`${user?.external_accounts?.length ?? 0}`} onPress={() => router.push('/settings/external')} />
        <Row icon="⚡" title="My interests"     detail={`${tags.length} tag${tags.length === 1 ? '' : 's'}`} onPress={() => router.push('/settings/edit-tags')} last />
      </View>

      {/* Tag list */}
      {tags.length > 0 && (
        <>
          <Text style={s.groupLabel}>Your interests</Text>
          <View style={s.tagGroup}>
            {tags.map((tag, i) => (
              <View key={tag.id} style={[s.tagRow, i < tags.length - 1 && s.tagRowBorder]}>
                <View style={[s.tagDot, { backgroundColor: {
                  Sports: colors.peach, Arts: '#D4A93C', Outdoors: colors.green,
                  Food: colors.danger,  Social: '#4A7FBE',
                }[tag.category] ?? colors.green }]} />
                <Text style={s.tagName}>{tag.name}</Text>
                <Text style={s.tagCat}>{tag.category}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <Text style={s.groupLabel}>Account</Text>
      <View style={s.group}>
        <Row icon="✏️" title="Edit profile" detail="" onPress={() => router.push('/settings/edit-profile')} last />
      </View>

      <TouchableOpacity style={s.signOut} onPress={signOut}>
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll:        { flex: 1, backgroundColor: colors.cream },
  container:     { padding: 20, paddingTop: 60, paddingBottom: 60 },
  back:          { marginBottom: 16 },
  backText:      { color: colors.ink2, fontSize: 16 },
  headline:      { fontSize: 36, fontWeight: '800', color: colors.ink },
  email:         { fontSize: 13, color: colors.ink3, marginTop: 4, marginBottom: 24 },
  groupLabel:    { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
                   letterSpacing: 1.5, color: colors.ink3, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  group:         { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
                   borderColor: colors.line, overflow: 'hidden', marginBottom: 16 },
  row:           { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  rowBorder:     { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowIcon:       { fontSize: 18, width: 28 },
  rowTitle:      { flex: 1, fontSize: 15, color: colors.ink },
  rowDetail:     { fontSize: 13, color: colors.ink3 },
  tagGroup:      { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
                   borderColor: colors.line, overflow: 'hidden', marginBottom: 16 },
  tagRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
                   paddingVertical: 12, gap: 10 },
  tagRowBorder:  { borderBottomWidth: 1, borderBottomColor: colors.line },
  tagDot:        { width: 10, height: 10, borderRadius: 5 },
  tagName:       { flex: 1, fontSize: 15, color: colors.ink, fontWeight: '500' },
  tagCat:        { fontSize: 12, color: colors.ink3, fontFamily: 'monospace' },
  signOut:       { marginTop: 8, padding: 16, alignItems: 'center', borderRadius: 14,
                   borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  signOutText:   { color: colors.danger, fontWeight: '700', fontSize: 15 },
});