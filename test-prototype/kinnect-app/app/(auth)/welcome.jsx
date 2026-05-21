// app/(auth)/welcome.jsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../constants/theme';

export default function Welcome() {
  const router = useRouter();
  return (
    <View style={s.container}>
      <View style={s.hero}>
        <Text style={s.headline}>who's{'\n'}around{'\n'}<Text style={{ color: colors.green }}>right now</Text><Text style={{ color: colors.peach }}>?</Text></Text>
        <Text style={s.sub}>A neighborhood map for the people you'd actually want to meet — by interest, not by feed.</Text>
      </View>
      <View style={s.buttons}>
        <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/(auth)/signup')}>
          <Text style={s.btnPrimaryText}>Create an account</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnGhost} onPress={() => router.push('/(auth)/login')}>
          <Text style={s.btnGhostText}>I already have one</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.cream, padding: 28, paddingTop: 100 },
  hero:          { flex: 1, justifyContent: 'center' },
  headline:      { fontSize: 58, fontWeight: '800', color: colors.ink, lineHeight: 64 },
  sub:           { fontSize: 17, color: colors.ink2, lineHeight: 26, marginTop: 20, maxWidth: 300 },
  buttons:       { gap: 10, paddingBottom: 40 },
  btnPrimary:    { backgroundColor: colors.green, borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontSize: 17, fontWeight: '700' },
  btnGhost:      { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  btnGhostText:  { color: colors.ink2, fontSize: 17 },
});
