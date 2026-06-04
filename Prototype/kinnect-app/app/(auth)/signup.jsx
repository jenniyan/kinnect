// app/(auth)/signup.jsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { register } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function Signup() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [form, setForm] = useState({ display_name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.display_name || !form.email || !form.password) {
      return Alert.alert('Missing info', 'Please fill in all fields.');
    }
    if (form.password.length < 8) {
      return Alert.alert('Password too short', 'Must be at least 8 characters.');
    }
    setLoading(true);
    try {
      const res = await register(form);
      await signIn(res.data.access_token, res.data.user);
      router.replace('/(auth)/tags');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.headline}>let's get you{'\n'}on the map.</Text>
      <Text style={s.api}>POST /auth/register</Text>

      <View style={s.fields}>
        <Field label="Display name" value={form.display_name} onChangeText={v => set('display_name', v)} />
        <Field label="Email" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" autoCapitalize="none" />
        <Field label="Password" value={form.password} onChangeText={v => set('password', v)}
          secureTextEntry={!showPwd} placeholder="at least 8 characters"
          right={<TouchableOpacity onPress={() => setShowPwd(p => !p)}><Text style={{ color: colors.ink3 }}>{showPwd ? 'Hide' : 'Show'}</Text></TouchableOpacity>}
        />
      </View>

      <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Creating account…' : 'Continue →'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Field({ label, right, ...props }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={s.fieldRow}>
        <TextInput style={s.input} placeholderTextColor={colors.ink3} {...props} />
        {right}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  scroll:      { flex: 1, backgroundColor: colors.cream },
  container:   { padding: 24, paddingTop: 70, paddingBottom: 40 },
  back:        { marginBottom: 24 },
  backText:    { color: colors.ink2, fontSize: 16 },
  headline:    { fontSize: 36, fontWeight: '800', color: colors.ink, lineHeight: 42 },
  api:         { fontFamily: 'monospace', fontSize: 12, color: colors.ink3, marginTop: 6, marginBottom: 28 },
  fields:      { gap: 14 },
  fieldWrap:   {},
  fieldLabel:  { fontSize: 11, fontWeight: '700', color: colors.ink3, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  fieldRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.line },
  input:       { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.ink },
  btnPrimary:  { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 28 },
  btnText:     { color: '#fff', fontSize: 17, fontWeight: '700' },
});
