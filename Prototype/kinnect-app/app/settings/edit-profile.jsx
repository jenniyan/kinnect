// app/settings/edit-profile.jsx
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuth } from '../../services/auth';
import { updateProfile, getUserTags, uploadAvatar } from '../../services/api';
import { colors, catFor, catColor, tintFor, shadeFor } from '../../constants/theme';

// ── TagWithSubs ────────────────────────────────────────────────
function TagWithSubs({ tag, subtags = [], cat }) {
  const color = catColor(cat);
  return (
    <View style={[tg.row, { borderColor: color }]}>
      <View style={[tg.pill, { backgroundColor: color }]}>
        <Text style={tg.pillText}>{tag}</Text>
      </View>
      {subtags.length === 0 ? (
        <Text style={tg.noSpecifics}>no specifics</Text>
      ) : (
        subtags.map(s => (
          <View key={s} style={[tg.subChip, { backgroundColor: tintFor(color) }]}>
            <Text style={[tg.subChipText, { color: shadeFor(cat) }]}>#{s}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const tg = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
                 backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 14,
                 paddingVertical: 6, paddingLeft: 6, paddingRight: 10 },
  pill:        { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  pillText:    { color: '#fff', fontWeight: '600', fontSize: 13 },
  noSpecifics: { fontSize: 12, color: colors.ink3, fontStyle: 'italic' },
  subChip:     { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  subChipText: { fontSize: 12, fontWeight: '500' },
});

// ── Field ──────────────────────────────────────────────────────
function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, maxLength, editable = true }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, !editable && f.inputReadOnly]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink3}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        autoCorrect={false}
        maxLength={maxLength}
        editable={editable}
      />
    </View>
  );
}

const f = StyleSheet.create({
  wrap:          { marginBottom: 14 },
  label:         { fontSize: 11, fontWeight: '700', color: colors.ink3,
                   textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  input:         { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line,
                   borderRadius: 14, padding: 14, fontSize: 15, color: colors.ink },
  inputReadOnly: { backgroundColor: colors.cream2, color: colors.ink3 },
});

// ── Main screen ────────────────────────────────────────────────
export default function EditProfile() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio,         setBio]         = useState(user?.bio          || '');
  const [phone,       setPhone]       = useState(user?.phone        || '');
  const [myTags,      setMyTags]      = useState([]);
  const [saving,      setSaving]      = useState(false);
  const [photoUri,    setPhotoUri]    = useState(user?.avatar_url   || null);
  const [newPhotoUri, setNewPhotoUri] = useState(null); // local uri of newly picked photo

  useEffect(() => {
    (async () => {
      try {
        const res = await getUserTags(user.id);
        setMyTags(res.data?.tags ?? []);
      } catch {}
    })();
  }, []);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to change your profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6, // compress to keep base64 small
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewPhotoUri(result.assets[0].uri);
      setPhotoUri(result.assets[0].uri); // show preview immediately
    }
  };

  const save = async () => {
    if (!displayName.trim()) {
      Alert.alert('Display name required', 'Please enter a name to show on your profile.');
      return;
    }
    setSaving(true);
    try {
      // 1. Upload avatar if a new one was picked
      if (newPhotoUri) {
        const base64 = await FileSystem.readAsStringAsync(newPhotoUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const mimeType = newPhotoUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
        const avatarData = `data:${mimeType};base64,${base64}`;
        await uploadAvatar(avatarData);
      }

      // 2. Save profile fields
      await updateProfile({
        display_name: displayName.trim(),
        bio:          bio.trim(),
        phone:        phone.trim() || null,
      });

      await refreshUser();
      router.back();
    } catch (err) {
      console.log('[save profile error]', err.message, err.response?.data);
      Alert.alert('Error', err.response?.data?.error || 'Could not save profile. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = (displayName || user?.email || '?')[0].toUpperCase();

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={s.screen} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, saving && s.saveBtnDisabled]}
            onPress={save}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={s.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.headline}>Edit profile</Text>

        {/* Avatar */}
        <View style={s.avatarRow}>
          <TouchableOpacity onPress={pickPhoto} style={s.avatarWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={s.cameraBadge}>
              <Text style={{ fontSize: 12 }}>📷</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={s.photoBtn} onPress={pickPhoto}>
            <Text style={s.photoBtnText}>📷  Change photo</Text>
          </TouchableOpacity>
        </View>

        <Field
          label="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="How you appear on the map"
          maxLength={50}
        />

        <View style={s.bioWrap}>
          <Text style={f.label}>Bio</Text>
          <TextInput
            style={s.bioInput}
            value={bio}
            onChangeText={v => v.length <= 280 && setBio(v)}
            placeholder="A little about yourself…"
            placeholderTextColor={colors.ink3}
            multiline
            textAlignVertical="top"
          />
          <Text style={s.bioCount}>{bio.length}/280</Text>
        </View>

        <Field
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+1 (555) 000-0000"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />

        <Field
          label="Email"
          value={user?.email || ''}
          placeholder=""
          editable={false}
        />
        <Text style={s.readOnlyHint}>Email cannot be changed</Text>

        {myTags.length > 0 && (
          <View style={s.interestsSection}>
            <View style={s.sectionHead}>
              <Text style={s.sectionLabel}>Your interests</Text>
              <TouchableOpacity onPress={() => router.push('/settings/edit-tags')}>
                <Text style={s.sectionAction}>Edit</Text>
              </TouchableOpacity>
            </View>
            <View style={s.tagList}>
              {myTags.map(tag => (
                <TagWithSubs
                  key={tag.name || tag}
                  tag={tag.name || tag}
                  subtags={tag.subtags?.map(s => s.name ?? s) || []}
                  cat={catFor(tag.name || tag)}
                />
              ))}
            </View>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: colors.cream },
  container:        { padding: 20, paddingTop: 60, paddingBottom: 60 },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backText:         { color: colors.ink2, fontSize: 16 },
  saveBtn:          { backgroundColor: colors.green, borderRadius: 99, paddingHorizontal: 18, paddingVertical: 8, minWidth: 64, alignItems: 'center' },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  headline:         { fontSize: 36, fontWeight: '800', color: colors.ink, marginBottom: 20 },
  avatarRow:        { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 22 },
  avatarWrap:       { position: 'relative' },
  avatar:           { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  avatarImg:        { width: 72, height: 72, borderRadius: 36 },
  avatarText:       { fontSize: 30, fontWeight: '800', color: '#fff' },
  cameraBadge:      { position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: 11,
                      backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5, borderColor: colors.line },
  photoBtn:         { backgroundColor: colors.cream2, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9 },
  photoBtnText:     { fontSize: 14, fontWeight: '600', color: colors.ink2 },
  bioWrap:          { marginBottom: 14 },
  bioInput:         { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, padding: 14, fontSize: 15, color: colors.ink, minHeight: 96 },
  bioCount:         { textAlign: 'right', fontSize: 11, color: colors.ink3, fontFamily: 'monospace', marginTop: 4 },
  readOnlyHint:     { fontSize: 11, color: colors.ink3, marginTop: -10, marginBottom: 14, paddingLeft: 2 },
  interestsSection: { marginTop: 8 },
  sectionHead:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  sectionLabel:     { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: colors.ink3, fontWeight: '700' },
  sectionAction:    { fontSize: 13, fontWeight: '600', color: colors.green },
  tagList:          { gap: 6, flexDirection: 'column' },
});