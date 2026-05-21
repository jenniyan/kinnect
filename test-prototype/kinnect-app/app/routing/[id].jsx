// app/routing/[id].jsx
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updateRoutingRequest, getRouteBetweenUsers } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function RoutingScreen() {
  const { id, targetName } = useLocalSearchParams();
  const { user } = useAuth();
  const router   = useRouter();

  const [status,  setStatus]  = useState('pending'); // pending | accepted | declined
  const [route,   setRoute]   = useState(null);
  const [loading, setLoading] = useState(false);

  // Simulate acceptance after 3s (in real app, target user accepts via their device)
  useEffect(() => {
    const t = setTimeout(() => setStatus('accepted'), 3000);
    return () => clearTimeout(t);
  }, []);

  // Once accepted, fetch the route
  useEffect(() => {
    if (status === 'accepted') fetchRoute();
  }, [status]);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      const res = await getRouteBetweenUsers({ requester_id: user.id, target_id: id });
      setRoute(res.data.route);
    } catch {}
    setLoading(false);
  };

  const cancel = async () => {
    try { await updateRoutingRequest(id, 'cancelled'); } catch {}
    router.back();
  };

  return (
    <View style={s.container}>
      <MapView style={s.map} showsUserLocation />

      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>←</Text>
      </TouchableOpacity>

      {/* Status card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{(targetName || '?').charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardName}>Route to {targetName || 'User'}</Text>
            {route && <Text style={s.cardSub}>{route.distance_text} · {route.duration_text}</Text>}
          </View>
          <View style={[s.statusDot, { backgroundColor: status === 'accepted' ? colors.green : colors.butter }]} />
        </View>

        <View style={[s.statusBanner, { backgroundColor: status === 'accepted' ? colors.green + '18' : colors.cream2 }]}>
          {loading ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <Text style={[s.statusText, status === 'accepted' && { color: colors.green700 }]}>
              {status === 'pending'
                ? `Waiting for ${targetName || 'them'} to accept…`
                : `${targetName || 'They'} accepted — live sharing active`}
            </Text>
          )}
        </View>

        <View style={s.actions}>
          <TouchableOpacity style={s.btnSoft} onPress={cancel}>
            <Text style={s.btnSoftText}>{status === 'pending' ? 'Cancel' : 'End sharing'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnPrimary} onPress={() => router.push('/chat')}>
            <Text style={s.btnPrimaryText}>Open chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1 },
  map:         { flex: 1 },
  backBtn:     { position: 'absolute', top: 60, left: 16,
                 backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22,
                 width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                 shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  backText:    { fontSize: 22, color: colors.ink },
  card:        { position: 'absolute', bottom: 90, left: 12, right: 12,
                 backgroundColor: '#fff', borderRadius: 24, padding: 16,
                 shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar:      { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green,
                 alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#fff', fontWeight: '800', fontSize: 20 },
  cardName:    { fontSize: 18, fontWeight: '800', color: colors.ink },
  cardSub:     { fontSize: 13, color: colors.ink3, marginTop: 2 },
  statusDot:   { width: 10, height: 10, borderRadius: 5 },
  statusBanner:{ borderRadius: 12, padding: 12, marginBottom: 14, alignItems: 'center' },
  statusText:  { fontSize: 14, color: colors.ink2, fontWeight: '500', textAlign: 'center' },
  actions:     { flexDirection: 'row', gap: 8 },
  btnSoft:     { flex: 1, backgroundColor: colors.cream, borderRadius: 14, padding: 14,
                 alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  btnSoftText: { color: colors.ink2, fontWeight: '600', fontSize: 15 },
  btnPrimary:  { flex: 1, backgroundColor: colors.green, borderRadius: 14, padding: 14, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
});
