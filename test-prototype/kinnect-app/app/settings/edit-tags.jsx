// app/settings/edit-tags.jsx
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useAuth } from '../../services/auth';
import { getUserTags, addUserTags, removeUserTag, resolveTags } from '../../services/api';
import {
  colors, TAG_LIBRARY, SUBTAG_LIBRARY,
  catFor, catColor, tintFor, shadeFor,
} from '../../constants/theme';

// ── TagCustomizeSheet ──────────────────────────────────────────
function TagCustomizeSheet({ parent, parentColor, current, onSave, onClose }) {
  const [active, setActive] = useState(new Set(current));
  const [custom, setCustom] = useState('');
  const suggestions = SUBTAG_LIBRARY[parent] || [];

  const toggle = (t) => {
    const n = new Set(active);
    n.has(t) ? n.delete(t) : n.add(t);
    setActive(n);
  };

  const addCustom = () => {
    const v = custom.trim().toLowerCase().replace(/^#/, '');
    if (!v) return;
    const n = new Set(active);
    n.add(v);
    setActive(n);
    setCustom('');
  };

  const customEntries = [...active].filter(a => !suggestions.includes(a));

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cs.backdrop} onPress={onClose}>
        <Pressable style={cs.sheet} onPress={() => {}}>
          {/* Grab bar */}
          <View style={cs.grab} />

          {/* Title */}
          <View style={cs.titleRow}>
            <View style={[cs.dot, { backgroundColor: parentColor }]} />
            <Text style={cs.title}>
              Customize <Text style={{ color: parentColor }}>{parent}</Text>
            </Text>
          </View>
          <Text style={cs.subtitle}>
            Add specifics so people who share the same niche can find you.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Suggested */}
            <Text style={cs.sectionLabel}>suggested</Text>
            <View style={cs.chips}>
              {suggestions.map(s => {
                const on = active.has(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[cs.chip, on && { backgroundColor: parentColor, borderColor: parentColor }]}
                    onPress={() => toggle(s)}
                  >
                    <Text style={[cs.chipText, on && { color: '#fff' }]}>#{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom entries */}
            {customEntries.length > 0 && (
              <>
                <Text style={cs.sectionLabel}>your custom</Text>
                <View style={cs.chips}>
                  {customEntries.map(s => (
                    <TouchableOpacity
                      key={s}
                      style={[cs.chip, { backgroundColor: parentColor, borderColor: parentColor }]}
                      onPress={() => toggle(s)}
                    >
                      <Text style={[cs.chipText, { color: '#fff' }]}>#{s}  ✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Add your own */}
            <Text style={cs.sectionLabel}>add your own</Text>
            <View style={cs.inputRow}>
              <Text style={cs.hashPrefix}>#</Text>
              <TextInput
                style={cs.customInput}
                value={custom}
                onChangeText={setCustom}
                placeholder="e.g. beach, dawn-patrol, pour-over"
                placeholderTextColor={colors.ink3}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={addCustom}
              />
              <TouchableOpacity
                style={[cs.addBtn, { backgroundColor: custom.trim() ? parentColor : colors.cream2 }]}
                onPress={addCustom}
                disabled={!custom.trim()}
              >
                <Text style={[cs.addBtnText, { color: custom.trim() ? '#fff' : colors.ink3 }]}>Add</Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Actions */}
          <View style={cs.actions}>
            <TouchableOpacity style={cs.cancelBtn} onPress={onClose}>
              <Text style={cs.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[cs.saveBtn, { backgroundColor: parentColor }]}
              onPress={() => { onSave([...active]); onClose(); }}
            >
              <Text style={cs.saveBtnText}>
                Save{active.size > 0 ? ` (${active.size})` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const cs = StyleSheet.create({
  backdrop:     { flex: 1, backgroundColor: 'rgba(20,32,25,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                  padding: 20, paddingTop: 10, maxHeight: '80%' },
  grab:         { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line,
                  alignSelf: 'center', marginBottom: 16 },
  titleRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  title:        { fontSize: 22, fontWeight: '800', color: colors.ink },
  subtitle:     { fontSize: 13, color: colors.ink3, marginBottom: 20, lineHeight: 18 },
  sectionLabel: { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: 1.2, color: colors.ink3, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  chip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99,
                  borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff' },
  chipText:     { fontSize: 13, color: colors.ink2, fontWeight: '500' },
  inputRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
                  borderWidth: 1.5, borderColor: colors.line, borderRadius: 14,
                  paddingLeft: 14, paddingRight: 6, paddingVertical: 4, marginBottom: 12 },
  hashPrefix:   { fontSize: 15, color: colors.ink3, marginRight: 2 },
  customInput:  { flex: 1, fontSize: 15, color: colors.ink, paddingVertical: 8 },
  addBtn:       { borderRadius: 99, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText:   { fontWeight: '600', fontSize: 13 },
  actions:      { flexDirection: 'row', gap: 8, marginTop: 8 },
  cancelBtn:    { flex: 1, backgroundColor: colors.cream2, borderRadius: 14,
                  padding: 14, alignItems: 'center' },
  cancelText:   { fontWeight: '600', color: colors.ink2, fontSize: 15 },
  saveBtn:      { flex: 2, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveBtnText:  { fontWeight: '700', color: '#fff', fontSize: 15 },
});

// ── SelectedTagRow ─────────────────────────────────────────────
// The "selected" state: colored pill + #subtag chips + customize button
function SelectedTagRow({ tag, cat, subtags, onRemove, onCustomize }) {
  const color = catColor(cat);
  const tint  = tintFor(color);
  const shade = shadeFor(cat);
  return (
    <View style={[r.row, { borderColor: color }]}>
      {/* Main tag pill — tap to deselect */}
      <TouchableOpacity style={[r.pill, { backgroundColor: color }]} onPress={onRemove}>
        <Text style={r.pillText}>✓ {tag}</Text>
      </TouchableOpacity>

      {/* Subtag chips */}
      {subtags.length === 0 ? (
        <Text style={r.noSpecifics}>no specifics</Text>
      ) : (
        subtags.map(s => (
          <View key={s} style={[r.subChip, { backgroundColor: tint }]}>
            <Text style={[r.subChipText, { color: shade }]}>#{s}</Text>
          </View>
        ))
      )}

      {/* Customize button */}
      <TouchableOpacity
        style={[r.customizeBtn, { borderColor: color }]}
        onPress={onCustomize}
      >
        <Text style={[r.customizeBtnText, { color }]}>
          {subtags.length === 0 ? '+ specifics' : `+${subtags.length} ▸`}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const r = StyleSheet.create({
  row:              { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6,
                      backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 14,
                      paddingVertical: 8, paddingLeft: 8, paddingRight: 10 },
  pill:             { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  pillText:         { color: '#fff', fontWeight: '600', fontSize: 13 },
  noSpecifics:      { fontSize: 12, color: colors.ink3, fontStyle: 'italic' },
  subChip:          { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  subChipText:      { fontSize: 12, fontWeight: '500' },
  customizeBtn:     { marginLeft: 'auto', borderWidth: 1, borderStyle: 'dashed',
                      borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  customizeBtnText: { fontSize: 12, fontWeight: '600' },
});

// ── Main screen ────────────────────────────────────────────────
export default function EditTags() {
  const router = useRouter();
  const { user } = useAuth();

  // name → id map for deletion
  const [tagIdMap,   setTagIdMap]   = useState({});
  // name → subtags (strings) — subtags are local-only for now, saved via updateProfile or a separate endpoint
  const [myTags,     setMyTags]     = useState(new Set());
  const [mySubtags,  setMySubtags]  = useState({}); // { tagName: ['doubles', 'beach'] }
  const [loading,    setLoading]    = useState(true);
  const [busy,       setBusy]       = useState(null);
  const [sheetFor,   setSheetFor]   = useState(null); // tag name whose sheet is open

  useEffect(() => {
    (async () => {
      try {
        const res  = await getUserTags(user.id);
        const tags = res.data?.tags ?? [];
        setMyTags(new Set(tags.map(t => t.name)));
        const idMap = {};
        const subMap = {};
        tags.forEach(t => {
          idMap[t.name] = t.id;
          if (t.subtags?.length) subMap[t.name] = t.subtags.map(s => s.name ?? s);
        });
        setTagIdMap(idMap);
        setMySubtags(subMap);
      } catch {
        Alert.alert('Error', 'Could not load your interests.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleTag = async (tagName) => {
  if (busy) return;
  const has = myTags.has(tagName);
  setBusy(tagName);
  try {
    if (has) {
      const tagId = tagIdMap[tagName];
      if (tagId) await removeUserTag(tagId);
      setMyTags(s  => { const n = new Set(s); n.delete(tagName); return n; });
      setMySubtags(m => { const n = { ...m }; delete n[tagName]; return n; });
      setTagIdMap(m  => { const n = { ...m }; delete n[tagName]; return n; });
    } else {
  const res = await resolveTags([tagName]);
  console.log('resolve raw:', JSON.stringify(res.data));
  const tag = (res.data?.tags ?? [])[0];
  console.log('resolved tag:', tag);
  if (tag) {
    const addRes = await addUserTags([tag.id]);
    console.log('addUserTags response:', JSON.stringify(addRes.data));
    setMyTags(s => new Set([...s, tagName]));
    setTagIdMap(m => ({ ...m, [tagName]: tag.id }));
  } else {
    console.log('tag not found in resolve response');
  }
}
  } catch (err) {
    Alert.alert('Error', `Could not update "${tagName}". Try again.`);
  } finally {
    setBusy(null);
  }
};

  const saveSubtags = async (tagName, arr) => {
  setMySubtags(m => ({ ...m, [tagName]: arr }));
  const parentId = tagIdMap[tagName];
  const cat = catFor(tagName);
  if (!parentId) return;

  try {
    // Create each subtag as a custom tag, then add to user_tags
    for (const subName of arr) {
      // Create the custom tag with parent reference
      const createRes = await createTag({ name: subName, category: cat, parent_tag_id: parentId });
      const subTag = createRes.data;
      // Add to user's tags
      await addUserTags([subTag.id]);
      setTagIdMap(m => ({ ...m, [subName]: subTag.id }));
    }
    // Remove any subtags that were deselected
    // (get current subtag ids from tagIdMap and remove ones not in arr)
    const currentSubs = mySubtags[tagName] || [];
    for (const old of currentSubs) {
      if (!arr.includes(old)) {
        const oldId = tagIdMap[old];
        if (oldId) await removeUserTag(oldId);
      }
    }
  } catch (err) {
    Alert.alert('Error', 'Could not save subtags. Try again.');
  }
};

  const totalSubtags = Object.values(mySubtags).reduce((acc, arr) => acc + arr.length, 0);

  return (
    <View style={s.wrapper}>
      <ScrollView style={s.screen} contentContainerStyle={s.container}>
        {/* Header */}
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()}>
            <Text style={s.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.headline}>Your interests</Text>
        <Text style={s.sub}>
          <Text style={s.mono}>{myTags.size}</Text> tags + <Text style={s.mono}>{totalSubtags}</Text> sub-tags · tap a selected one to add specifics
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 40 }} />
        ) : (
          Object.entries(TAG_LIBRARY).map(([cat, tags]) => {
            const selected   = tags.filter(t => myTags.has(t));
            const unselected = tags.filter(t => !myTags.has(t));
            return (
              <View key={cat} style={s.section}>
                <Text style={s.catLabel}>{cat}</Text>

                {/* Selected tags — full row with subtags */}
                {selected.length > 0 && (
                  <View style={s.selectedList}>
                    {selected.map(t => (
                      busy === t ? (
                        <View key={t} style={[r.row, { borderColor: catColor(cat) }]}>
                          <ActivityIndicator color={catColor(cat)} style={{ margin: 6 }} />
                        </View>
                      ) : (
                        <SelectedTagRow
                          key={t}
                          tag={t}
                          cat={cat}
                          subtags={mySubtags[t] || []}
                          onRemove={() => toggleTag(t)}
                          onCustomize={() => setSheetFor(t)}
                        />
                      )
                    ))}
                  </View>
                )}

                {/* Unselected tags — plain chips */}
                <View style={s.chips}>
                  {unselected.map(t => (
                    <TouchableOpacity
                      key={t}
                      style={[s.chip, busy === t && s.chipBusy]}
                      onPress={() => toggleTag(t)}
                      activeOpacity={0.7}
                    >
                      {busy === t
                        ? <ActivityIndicator color={colors.ink2} size="small" />
                        : <Text style={s.chipText}>{t}</Text>}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Customize sheet */}
      {sheetFor && (
        <TagCustomizeSheet
          parent={sheetFor}
          parentColor={catColor(catFor(sheetFor))}
          current={mySubtags[sheetFor] || []}
          onSave={(arr) => saveSubtags(sheetFor, arr)}
          onClose={() => setSheetFor(null)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:      { flex: 1, backgroundColor: colors.cream },
  screen:       { flex: 1 },
  container:    { padding: 20, paddingTop: 60 },
  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backText:     { color: colors.ink2, fontSize: 16 },
  doneBtn:      { backgroundColor: colors.green, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 7 },
  doneBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  headline:     { fontSize: 36, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  sub:          { fontSize: 13, color: colors.ink3, marginBottom: 24 },
  mono:         { fontFamily: 'monospace' },
  section:      { marginBottom: 22 },
  catLabel:     { fontFamily: 'monospace', fontSize: 11, textTransform: 'uppercase',
                  letterSpacing: 1.5, color: colors.ink3, fontWeight: '700', marginBottom: 10 },
  selectedList: { flexDirection: 'column', gap: 6, marginBottom: 10 },
  chips:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
                  borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff',
                  minWidth: 60, alignItems: 'center' },
  chipBusy:     { opacity: 0.5 },
  chipText:     { fontSize: 14, color: colors.ink2, fontWeight: '500' },
});
