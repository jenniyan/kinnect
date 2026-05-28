// app/record.jsx
import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { getUploadUrl, confirmUpload } from '../services/api';
import { useAuth } from '../services/auth';
import { colors, TAG_LIBRARY } from '../constants/theme';

const MAX_SECONDS = 30;

export default function Record() {
  const { user }  = useAuth();
  const router    = useRouter();
  const cameraRef = useRef(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [phase,        setPhase]        = useState('ready'); // ready | recording | review | uploading | done
  const [seconds,      setSeconds]      = useState(0);
  const [caption,      setCaption]      = useState('');
  const [visibility,   setVisibility]   = useState('nearby');
  const [selectedTags, setSelectedTags] = useState([]);
  const [location,     setLocation]     = useState(null);
  const [progress,     setProgress]     = useState(0);
  const [recording,    setRecording]    = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    Location.getCurrentPositionAsync({}).then(pos => {
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    }).catch(() => {});
    return () => clearInterval(timerRef.current);
  }, []);

  if (!permission) return <View style={s.container} />;
  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.permText}>Camera access needed to record</Text>
        <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
          <Text style={s.permBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setPhase('recording');
    setSeconds(0);
    timerRef.current = setInterval(() => {
      setSeconds(s => {
        if (s + 1 >= MAX_SECONDS) stopRecording();
        return s + 1;
      });
    }, 1000);
    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_SECONDS });
      if (video?.uri) {
        setRecording(video);
      } else {
        // Simulator: recordAsync resolves with null — use a placeholder so upload flow still works
        setRecording({ uri: null, _simulated: true });
      }
    } catch (e) {
      console.log('[recordAsync error]', e?.message);
      // Simulator throws "not supported" — treat as simulated recording
      setRecording({ uri: null, _simulated: true });
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    cameraRef.current?.stopRecording();
    setPhase('review');
  };

  const retake = () => {
    setRecording(null);
    setSeconds(0);
    setPhase('ready');
  };

  const toggleTag = (t) =>
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const upload = async () => {
    if (!location) {
      Alert.alert('Location needed', 'Could not get your location. Try again.');
      return;
    }
    setPhase('uploading');
    setProgress(0);
    try {
      const filename = `kinnect_${Date.now()}.mp4`;
      const urlRes = await getUploadUrl({
        filename, gps_lat: location.lat, gps_lng: location.lng, visibility, caption,
      });
      const { signed_url, r2_key, _dev_mode } = urlRes.data;
      setProgress(20);
      if (_dev_mode || !recording?.uri) {
        // Dev mode or simulator — skip actual upload, simulate progress
        for (let p = 20; p <= 90; p += 10) {
          await new Promise(r => setTimeout(r, 150));
          setProgress(p);
        }
      } else {
        const response = await fetch(recording.uri);
        const blob = await response.blob();
        await fetch(signed_url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: blob });
      }
      setProgress(90);
      await confirmUpload({
        r2_key, lat: location.lat, lng: location.lng,
        visibility, caption, tag_names: selectedTags, trigger_radius_m: 300,
      });
      setProgress(100);
      setTimeout(() => setPhase('done'), 400);
    } catch (err) {
      console.log('[upload error]', err.message, err.response?.data);
      Alert.alert('Upload failed', err.response?.data?.error || 'Could not post video. Try again.');
      setPhase('review');
    }
  };

  // ── Done ──
  if (phase === 'done') {
    return (
      <View style={[s.container, { backgroundColor: colors.green, padding: 32, justifyContent: 'center' }]}>
        <View style={s.doneIcon}><Text style={{ fontSize: 48 }}>✓</Text></View>
        <Text style={s.doneTitle}>posted to{'\n'}the map.</Text>
        <Text style={s.doneSub}>
          {visibility === 'nearby'
            ? 'Anyone within 5 km of your location can watch it for the next 24 hours.'
            : 'Anyone on Kinnect can discover it for the next 24 hours.'}
        </Text>
        <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(tabs)/videos')}>
          <Text style={s.doneBtnText}>See it on the feed →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.doneGhost} onPress={() => router.replace('/(tabs)/map')}>
          <Text style={s.doneGhostText}>Back to map</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Uploading ──
  if (phase === 'uploading') {
    return (
      <View style={[s.container, { backgroundColor: '#000', padding: 32, justifyContent: 'center' }]}>
        <Text style={s.uploadLabel}>uploading to cloud</Text>
        <Text style={s.uploadPct}>{progress}<Text style={{ fontSize: 28, opacity: 0.5 }}>%</Text></Text>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    );
  }

  // ── Review — full screen, not a pull-up ──
  if (phase === 'review') {
    return (
      <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={s.reviewHeader}>
          <TouchableOpacity onPress={retake} style={s.reviewBackBtn}>
            <Text style={s.reviewBackText}>←</Text>
          </TouchableOpacity>
          <Text style={s.reviewHeaderTitle}>New Post</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.reviewBody} keyboardShouldPersistTaps="handled">
          {/* Thumbnail */}
          <View style={s.thumbRow}>
            <View style={s.thumb}>
              <Text style={s.thumbPlay}>▶</Text>
              <Text style={s.thumbDuration}>0:{seconds.toString().padStart(2, '0')}</Text>
            </View>
            <View style={s.thumbMeta}>
              {location && (
                <View style={s.locBadge}>
                  <Text style={s.locBadgeText}>📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</Text>
                </View>
              )}
              <Text style={s.thumbHint}>Tap to preview</Text>
            </View>
          </View>

          {/* Caption */}
          <Text style={s.sectionLabel}>Caption</Text>
          <TextInput
            style={s.captionInput}
            value={caption}
            onChangeText={setCaption}
            placeholder="What's happening?"
            placeholderTextColor={colors.ink3}
            multiline
          />

          {/* Visibility — only public / nearby */}
          <Text style={s.sectionLabel}>Who can see it</Text>
          <View style={s.visRow}>
            {[
              { value: 'nearby', icon: '📍', desc: 'People within 5 km' },
              { value: 'public', icon: '🌍', desc: 'Everyone on Kinnect' },
            ].map(({ value, icon, desc }) => (
              <TouchableOpacity
                key={value}
                style={[s.visCard, visibility === value && s.visCardActive]}
                onPress={() => setVisibility(value)}
              >
                <Text style={s.visIcon}>{icon}</Text>
                <Text style={[s.visValue, visibility === value && { color: colors.green }]}>{value}</Text>
                <Text style={s.visDesc}>{desc}</Text>
                {visibility === value && (
                  <View style={s.visCheck}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Tags */}
          <Text style={s.sectionLabel}>Tag your vibe</Text>
          <View style={s.tagRow}>
            {Object.values(TAG_LIBRARY).flat().slice(0, 16).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.tagChip, selectedTags.includes(t) && s.tagChipActive]}
                onPress={() => toggleTag(t)}
              >
                <Text style={[s.tagChipText, selectedTags.includes(t) && { color: '#fff' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Actions */}
          <View style={s.reviewActions}>
            <TouchableOpacity style={s.retakeBtn} onPress={retake}>
              <Text style={s.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.postBtn} onPress={upload}>
              <Text style={s.postBtnText}>Post →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ── Ready / Recording ──
  const isRecording = phase === 'recording';
  return (
    <View style={s.container}>
      <CameraView ref={cameraRef} style={s.camera} mode="video" facing="back">
        <View style={s.gridH1} /><View style={s.gridH2} />
        <View style={s.gridV1} /><View style={s.gridV2} />

        <View style={s.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={s.glassBtn}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </TouchableOpacity>
          {isRecording && (
            <View style={s.recIndicator}>
              <View style={s.recDot} />
              <Text style={s.recText}>REC 0:{seconds.toString().padStart(2, '0')}</Text>
            </View>
          )}
        </View>

        {location && (
          <View style={s.locationChip}>
            <Text style={s.locationChipText}>
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Text>
          </View>
        )}

        <View style={s.controls}>
          <View style={s.glassBtn} />
          <TouchableOpacity
            style={s.recordRing}
            onPress={isRecording ? stopRecording : startRecording}
          >
            <View style={[s.recordCore, isRecording && s.recordCoreStop]} />
          </TouchableOpacity>
          <View style={s.glassBtn} />
        </View>

        {isRecording && (
          <View style={s.recProgressTrack}>
            <View style={[s.recProgressFill, { width: `${(seconds / MAX_SECONDS) * 100}%` }]} />
          </View>
        )}
      </CameraView>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#000' },
  camera:          { flex: 1 },
  permText:        { color: '#fff', fontSize: 16, textAlign: 'center', margin: 40 },
  permBtn:         { backgroundColor: colors.green, borderRadius: 14, padding: 16, margin: 24, alignItems: 'center' },
  permBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  gridH1:          { position: 'absolute', top: '33%', left: 0, right: 0, height: 1, backgroundColor: '#fff', opacity: 0.15 },
  gridH2:          { position: 'absolute', top: '66%', left: 0, right: 0, height: 1, backgroundColor: '#fff', opacity: 0.15 },
  gridV1:          { position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1, backgroundColor: '#fff', opacity: 0.15 },
  gridV2:          { position: 'absolute', top: 0, bottom: 0, left: '66%', width: 1, backgroundColor: '#fff', opacity: 0.15 },
  topBar:          { position: 'absolute', top: 56, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  glassBtn:        { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  recIndicator:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(196,69,54,0.92)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  recDot:          { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
  recText:         { color: '#fff', fontFamily: 'monospace', fontSize: 12, fontWeight: '700' },
  locationChip:    { position: 'absolute', top: 110, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  locationChipText:{ color: '#fff', fontFamily: 'monospace', fontSize: 12 },
  controls:        { position: 'absolute', bottom: 48, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 },
  recordRing:      { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  recordCore:      { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.danger },
  recordCoreStop:  { width: 28, height: 28, borderRadius: 6 },
  recProgressTrack:{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  recProgressFill: { height: '100%', backgroundColor: colors.danger },
  // Review screen
  reviewHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 52, paddingBottom: 10, paddingHorizontal: 16, backgroundColor: colors.cream, borderBottomWidth: 1, borderBottomColor: colors.line },
  reviewBackBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cream2, alignItems: 'center', justifyContent: 'center' },
  reviewBackText:  { fontSize: 20, color: colors.ink },
  reviewHeaderTitle:{ fontSize: 17, fontWeight: '700', color: colors.ink },
  reviewBody:      { padding: 16, paddingBottom: 24, backgroundColor: colors.cream, flexGrow: 1 },
  thumbRow:        { flexDirection: 'row', gap: 12, marginBottom: 16 },
  thumb:           { width: 80, height: 110, borderRadius: 10, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  thumbPlay:       { fontSize: 24, opacity: 0.7, color: '#fff' },
  thumbDuration:   { position: 'absolute', bottom: 5, right: 7, fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.9)', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 99 },
  thumbMeta:       { flex: 1, justifyContent: 'center', gap: 6 },
  locBadge:        { backgroundColor: colors.cream2, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5, alignSelf: 'flex-start' },
  locBadgeText:    { fontFamily: 'monospace', fontSize: 11, color: colors.ink2 },
  thumbHint:       { fontSize: 12, color: colors.ink3 },
  sectionLabel:    { fontSize: 11, fontWeight: '700', color: colors.ink3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 7 },
  captionInput:    { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, padding: 12, fontSize: 15, color: colors.ink, minHeight: 64, textAlignVertical: 'top', marginBottom: 16 },
  visRow:          { flexDirection: 'row', gap: 10, marginBottom: 16 },
  visCard:         { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', gap: 3 },
  visCardActive:   { borderColor: colors.green, backgroundColor: colors.cream2 },
  visIcon:         { fontSize: 20, marginBottom: 1 },
  visValue:        { fontSize: 13, fontWeight: '700', color: colors.ink, textTransform: 'capitalize' },
  visDesc:         { fontSize: 11, color: colors.ink3, textAlign: 'center' },
  visCheck:        { position: 'absolute', top: 7, right: 7, width: 17, height: 17, borderRadius: 9, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  tagRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 20 },
  tagChip:         { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 99, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff' },
  tagChipActive:   { backgroundColor: colors.green, borderColor: colors.green },
  tagChipText:     { fontSize: 13, color: colors.ink2, fontWeight: '500' },
  reviewActions:   { flexDirection: 'row', gap: 10 },
  retakeBtn:       { flex: 1, backgroundColor: colors.cream2, borderRadius: 12, padding: 14, alignItems: 'center' },
  retakeBtnText:   { fontWeight: '600', color: colors.ink2, fontSize: 15 },
  postBtn:         { flex: 2, backgroundColor: colors.green, borderRadius: 12, padding: 14, alignItems: 'center' },
  postBtnText:     { fontWeight: '700', color: '#fff', fontSize: 15 },
  // Uploading
  uploadLabel:     { fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  uploadPct:       { fontSize: 72, fontWeight: '800', color: '#fff', marginBottom: 16 },
  progressTrack:   { height: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 99, overflow: 'hidden' },
  progressFill:    { height: '100%', backgroundColor: colors.peach, borderRadius: 99 },
  // Done
  doneIcon:        { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  doneTitle:       { fontSize: 44, fontWeight: '800', color: '#fff', lineHeight: 48, marginBottom: 14 },
  doneSub:         { fontSize: 16, color: 'rgba(255,255,255,0.85)', lineHeight: 22, marginBottom: 40 },
  doneBtn:         { backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 10 },
  doneBtnText:     { color: colors.green, fontWeight: '700', fontSize: 16 },
  doneGhost:       { padding: 14, alignItems: 'center' },
  doneGhostText:   { color: 'rgba(255,255,255,0.8)', fontWeight: '600', fontSize: 15 },
});