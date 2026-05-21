// app/(auth)/login.jsx
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function Login() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) return Alert.alert('Missing info', 'Enter your email and password.');
    setLoading(true);
    try {
      const res = await login({ email, password });
      await signIn(res.data.access_token, res.data.user);
      router.replace('/(tabs)/map');
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <TouchableOpacity onPress={() => router.back()} style={s.back}>
        <Text style={s.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={s.headline}>welcome{'\n'}back.</Text>

      <View style={s.fields}>
        <TextInput style={s.input} placeholder="Email" placeholderTextColor={colors.ink3}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TextInput style={s.input} placeholder="Password" placeholderTextColor={colors.ink3}
          value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      <TouchableOpacity style={[s.btnPrimary, loading && { opacity: 0.6 }]} onPress={submit} disabled={loading}>
        <Text style={s.btnText}>{loading ? 'Logging in…' : 'Log in'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.cream, padding: 24, paddingTop: 70 },
  back:       { marginBottom: 28 },
  backText:   { color: colors.ink2, fontSize: 16 },
  headline:   { fontSize: 40, fontWeight: '800', color: colors.ink, lineHeight: 46, marginBottom: 32 },
  fields:     { gap: 12 },
  input:      { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 16,
                fontSize: 16, color: colors.ink, borderWidth: 1.5, borderColor: colors.line },
  btnPrimary: { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 18, alignItems: 'center', marginTop: 24 },
  btnText:    { color: '#fff', fontSize: 17, fontWeight: '700' },
});
