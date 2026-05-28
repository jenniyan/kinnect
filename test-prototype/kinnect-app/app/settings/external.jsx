// app/settings/external.jsx
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
         Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { getMyExternal, saveExternalHandle, deleteExternal } from '../../services/api';
import { colors, PLATFORMS } from '../../constants/theme';

export default function ExternalAccounts() {
  const router = useRouter();
  const [handles,  setHandles]  = useState({});   // { instagram: '@foo', ... }
  const [editing,  setEditing]  = useState(null);
  const [draft,    setDraft]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
  (async () => {
    try {
      const res = await getMyExternal();
      console.log('external res:', JSON.stringify(res.data));
      const map = {};
      (res.data ?? []).forEach(a => { map[a.platform] = a.handle; });
      setHandles(map);
    } catch (err) {
      console.log('external error:', err.message, err.response?.status, JSON.stringify(err.response?.data));
      Alert.alert('Error', 'Could not load linked accounts.');
    } finally {
      setLoading(false);
    }
  })();
}, []);

  const startEdit = (platformId) => {
    setEditing(platformId);
    setDraft(handles[platformId] || '');
  };

  const cancelEdit = () => { setEditing(null); setDraft(''); };

  const save = async (platformId) => {
    const handle = draft.trim();
    if (!handle) {
      // blank = remove
      confirmDelete(platformId);
      return;
    }
    setSaving(true);
    try {
      await saveExternalHandle(platformId, handle);
      setHandles(h => ({ ...h, [platformId]: handle }));
      setEditing(null);
    } catch {
      Alert.alert('Error', 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (platformId) => {
    const name = PLATFORMS.find(p => p.id === platformId)?.name ?? platformId;
    Alert.alert(`Remove ${name}?`, "Your handle will be removed from your profile.", [
      { text: 'Cancel', style: 'cancel', onPress: cancelEdit },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          setSaving(true);
          try {
            await deleteExternal(platformId);
            setHandles(h => { const n = { ...h }; delete n[platformId]; return n; });
            setEditing(null);
          } catch {
            Alert.alert('Error', 'Could not remove. Try again.');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={s.container}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.headline}>Linked accounts</Text>
      <Text style={s.sub}>
        Where people can find you outside of kinnect. Shown on your profile only — never to people you've blocked.
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
      ) : (
        <View style={s.group}>
          {PLATFORMS.map((p, i) => {
            const isEditing = editing === p.id;
            const handle    = handles[p.id];
            return (
              <View key={p.id}>
                {i > 0 && <View style={s.divider} />}
                <View style={s.row}>
                  {/* Color dot */}
                  <View style={[s.dot, { backgroundColor: p.color }]} />
                  <View style={s.info}>
                    <Text style={s.platformName}>{p.name}</Text>
                    {isEditing ? (
                      <TextInput
                        style={s.input}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={p.placeholder}
                        placeholderTextColor={colors.ink3}
                        autoFocus
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="done"
                        onSubmitEditing={() => save(p.id)}
                      />
                    ) : (
                      <Text style={[s.handle, !handle && s.handleEmpty]}>
                        {handle || 'Not linked'}
                      </Text>
                    )}
                  </View>
                  {isEditing ? (
                    <View style={s.editActions}>
                      <TouchableOpacity onPress={cancelEdit} style={s.cancelBtn}>
                        <Text style={s.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => save(p.id)}
                        style={[s.saveBtn, saving && s.btnDisabled]}
                        disabled={saving}
                      >
                        {saving
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.saveBtnText}>Save</Text>}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => startEdit(p.id)} style={s.linkBtn}>
                      <Text style={s.linkBtnText}>{handle ? 'Edit' : 'Link'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:       { flex: 1, backgroundColor: colors.cream },
  container:    { padding: 20, paddingTop: 60, paddingBottom: 60 },
  back:         { marginBottom: 16 },
  backText:     { color: colors.ink2, fontSize: 16 },
  headline:     { fontSize: 36, fontWeight: '800', color: colors.ink, marginBottom: 8 },
  sub:          { fontSize: 14, color: colors.ink3, lineHeight: 20, marginBottom: 24, maxWidth: 340 },
  group:        { backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
                  borderColor: colors.line, overflow: 'hidden' },
  divider:      { height: 1, backgroundColor: colors.line, marginHorizontal: 14 },
  row:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  dot:          { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  info:         { flex: 1 },
  platformName: { fontSize: 15, fontWeight: '600', color: colors.ink, marginBottom: 2 },
  handle:       { fontFamily: 'monospace', fontSize: 12, color: colors.green },
  handleEmpty:  { color: colors.ink3 },
  input:        { fontFamily: 'monospace', fontSize: 13, color: colors.ink,
                  borderBottomWidth: 1.5, borderBottomColor: colors.green, paddingVertical: 2 },
  editActions:  { flexDirection: 'row', gap: 8 },
  cancelBtn:    { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line,
                  borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  cancelText:   { color: colors.ink2, fontWeight: '600', fontSize: 13 },
  saveBtn:      { backgroundColor: colors.green, borderRadius: 99,
                  paddingHorizontal: 14, paddingVertical: 6 },
  btnDisabled:  { opacity: 0.6 },
  saveBtnText:  { color: '#fff', fontWeight: '600', fontSize: 13 },
  linkBtn:      { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line,
                  borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  linkBtnText:  { color: colors.ink2, fontWeight: '600', fontSize: 13 },
});
