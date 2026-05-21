// app/(auth)/tags.jsx
import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { resolveTags, addUserTags } from '../../services/api';
import { colors, TAG_LIBRARY, catColor } from '../../constants/theme';

export default function TagPicker() {
  const router = useRouter();
  const [active, setActive] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const toggle = (tag) => {
    setActive(prev => {
      const next = new Set(prev);
      next.has(tag) ? next.delete(tag) : next.add(tag);
      return next;
    });
  };

  const save = async () => {
    if (active.size < 3) return Alert.alert('Pick at least 3', 'Choose at least 3 interests to get started.');
    setLoading(true);
    try {
      // Resolve tag names → IDs on the backend
      const res = await resolveTags([...active]);
      const ids  = res.data.tags.map(t => t.id);
      await addUserTags(ids);
      router.replace('/(tabs)/map');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Could not save tags.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headline}>pick a few{'\n'}<Text style={{ color: colors.peach }}>interests.</Text></Text>
        <Text style={s.sub}>Tap to select. People nearby with the same tags will appear on your map.</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {Object.entries(TAG_LIBRARY).map(([cat, tags]) => (
          <View key={cat} style={s.category}>
            <Text style={s.catLabel}>{cat}</Text>
            <View style={s.chips}>
              {tags.map(tag => {
                const on = active.has(tag);
                const color = catColor(cat);
                return (
                  <TouchableOpacity key={tag} onPress={() => toggle(tag)}
                    style={[s.chip, on && { backgroundColor: color, borderColor: color }]}>
                    <Text style={[s.chipText, on && { color: '#fff' }]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={s.footer}>
        <Text style={s.count}><Text style={{ color: colors.ink, fontWeight: '700' }}>{active.size}</Text> selected · min 3</Text>
        <TouchableOpacity
          style={[s.btnPrimary, (active.size < 3 || loading) && { opacity: 0.4 }]}
          onPress={save} disabled={active.size < 3 || loading}>
          <Text style={s.btnText}>{loading ? 'Saving…' : 'See the map →'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.cream },
  header:      { padding: 24, paddingTop: 70 },
  headline:    { fontSize: 34, fontWeight: '800', color: colors.ink, lineHeight: 40 },
  sub:         { fontSize: 14, color: colors.ink3, marginTop: 8, lineHeight: 20 },
  scroll:      { flex: 1 },
  scrollContent:{ padding: 20, paddingBottom: 10 },
  category:    { marginBottom: 20 },
  catLabel:    { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5,
                 color: colors.ink3, fontWeight: '700', marginBottom: 10 },
  chips:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99,
                 backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line },
  chipText:    { fontSize: 14, color: colors.ink2, fontWeight: '500' },
  footer:      { padding: 20, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.cream,
                 flexDirection: 'row', alignItems: 'center', gap: 12 },
  count:       { flex: 1, fontSize: 13, color: colors.ink3 },
  btnPrimary:  { backgroundColor: colors.green, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 22 },
  btnText:     { color: '#fff', fontSize: 15, fontWeight: '700' },
});
