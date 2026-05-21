// app/settings/privacy.jsx
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../services/auth';
import { updateProfile, hideLocation } from '../../services/api';
import { colors } from '../../constants/theme';

export default function PrivacySettings() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [anonymous, setAnonymous] = useState(user?.is_anonymous    ?? false);
  const [visible,   setVisible]   = useState(user?.location_visible ?? true);
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ is_anonymous: anonymous, location_visible: visible });
      if (!visible) await hideLocation();
      await refreshUser();
      router.back();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const bg = anonymous
    ? { backgroundColor: '#142019' }
    : { backgroundColor: colors.cream };
  const textColor = anonymous ? '#fff' : colors.ink;
  const subColor  = anonymous ? 'rgba(255,255,255,0.6)' : colors.ink3;
  const cardBg    = anonymous ? 'rgba(255,255,255,0.07)' : '#fff';
  const cardBorder= anonymous ? 'rgba(255,255,255,0.13)' : colors.line;

  return (
    <View style={[s.screen, bg]}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={[s.backText, { color: anonymous ? 'rgba(255,255,255,0.7)' : colors.ink2 }]}>← Back</Text>
      </TouchableOpacity>

      {/* Ghost icon */}
      <View style={[s.iconWrap, { backgroundColor: anonymous ? 'rgba(255,255,255,0.1)' : 'rgba(11,110,79,0.08)' }]}>
        <Text style={s.iconEmoji}>👻</Text>
      </View>

      <Text style={[s.headline, { color: textColor }]}>
        {anonymous ? "You're ghost mode." : 'Anonymous mode'}
      </Text>
      <Text style={[s.desc, { color: subColor }]}>
        When on, you appear on the map as a grey dot with no name. People can still send chat requests but won't see your interests until you accept.
      </Text>

      {/* Anonymous toggle */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={s.cardLeft}>
          <Text style={[s.cardTitle, { color: textColor }]}>Hide me</Text>
          <Text style={[s.cardSub,   { color: subColor }]}>Anonymous on the map</Text>
        </View>
        <Switch
          value={anonymous}
          onValueChange={setAnonymous}
          trackColor={{ false: 'rgba(20,32,25,0.2)', true: colors.green }}
          thumbColor="#fff"
        />
      </View>

      {/* Visibility toggle */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder, marginTop: 10 }]}>
        <View style={s.cardLeft}>
          <Text style={[s.cardTitle, { color: textColor }]}>Show me on the map</Text>
          <Text style={[s.cardSub,   { color: subColor }]}>If off, you can't see others either</Text>
        </View>
        <Switch
          value={visible}
          onValueChange={setVisible}
          trackColor={{ false: 'rgba(20,32,25,0.2)', true: colors.green }}
          thumbColor="#fff"
        />
      </View>

      <TouchableOpacity
        style={[s.saveBtn, saving && s.saveBtnDisabled]}
        onPress={save}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.saveBtnText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  screen:        { flex: 1, padding: 20, paddingTop: 60 },
  back:          { marginBottom: 20 },
  backText:      { fontSize: 16 },
  iconWrap:      { width: 90, height: 90, borderRadius: 45, alignItems: 'center',
                   justifyContent: 'center', marginBottom: 20 },
  iconEmoji:     { fontSize: 48 },
  headline:      { fontSize: 36, fontWeight: '800', lineHeight: 40, marginBottom: 10 },
  desc:          { fontSize: 15, lineHeight: 22, marginBottom: 24, maxWidth: 320 },
  card:          { borderRadius: 18, borderWidth: 1, padding: 16,
                   flexDirection: 'row', alignItems: 'center' },
  cardLeft:      { flex: 1 },
  cardTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  cardSub:       { fontSize: 13 },
  saveBtn:       { marginTop: 24, backgroundColor: colors.green, borderRadius: 14,
                   padding: 16, alignItems: 'center' },
  saveBtnDisabled:{ opacity: 0.6 },
  saveBtnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});
