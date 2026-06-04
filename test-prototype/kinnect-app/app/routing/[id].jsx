// app/routing/[id].jsx
import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { updateRoutingRequest, getRouteBetweenUsers, getUserById } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

// Decode Google-encoded polyline into [{latitude, longitude}] array
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

// Fallback demo route (walks through Irvine near UC Irvine)
const DEMO_ROUTE = {
  distance_text: '0.8 mi',
  duration_text: '4 min',
  polyline: [
    { latitude: 33.6438, longitude: -117.8419 },
    { latitude: 33.6448, longitude: -117.8433 },
    { latitude: 33.6461, longitude: -117.8442 },
    { latitude: 33.6473, longitude: -117.8433 },
    { latitude: 33.6473, longitude: -117.8428 },
    { latitude: 33.6495, longitude: -117.8433 },
    { latitude: 33.6498, longitude: -117.8439 }
  ],
  destination: { latitude: 33.6498, longitude: -117.8439 },
};

export default function RoutingScreen() {
  const { id, targetName, targetId } = useLocalSearchParams();
  const { user } = useAuth();
  const router   = useRouter();
  const mapRef   = useRef(null);

  const [status,    setStatus]    = useState('pending');
  const [polyline,  setPolyline]  = useState(null);
  const [routeMeta, setRouteMeta] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [origin,    setOrigin]    = useState(null);
  const [dest,      setDest]      = useState(null);
  const [targetAvatar, setTargetAvatar] = useState(null);

  useEffect(() => {
  if (!targetId) return;
  getUserById(targetId).then(r => setTargetAvatar(r.data?.avatar_url || null)).catch(() => {});
}, [targetId]);

  // Auto-accept after 3s for demo
  useEffect(() => {
    const t = setTimeout(() => setStatus('accepted'), 3000);
    return () => clearTimeout(t);
  }, []);

  // Once accepted, fetch route
  useEffect(() => {
    if (status === 'accepted') fetchRoute();
  }, [status]);

  const fetchRoute = async () => {
    setLoading(true);
    try {
      // targetId is the actual user to route to; id is the routing request id
      const res = await getRouteBetweenUsers({
        requester_id: user.id,
        target_id: targetId || id,
      });
      const route = res.data?.route;
      if (route) {
        const points = route.polyline_encoded
          ? decodePolyline(route.polyline_encoded)
          : route.polyline; // already decoded array
        setPolyline(points);
        setRouteMeta({ distance_text: route.distance_text, duration_text: route.duration_text });
        if (points?.length) {
          setOrigin(points[0]);
          setDest(points[points.length - 1]);
          fitMap(points);
        }
      } else {
        useDemoRoute();
      }
    } catch {
      useDemoRoute();
    }
    setLoading(false);
  };

  const useDemoRoute = () => {
    setPolyline(DEMO_ROUTE.polyline);
    setRouteMeta({ distance_text: DEMO_ROUTE.distance_text, duration_text: DEMO_ROUTE.duration_text });
    setOrigin(DEMO_ROUTE.polyline[0]);
    setDest(DEMO_ROUTE.destination);
    fitMap(DEMO_ROUTE.polyline);
  };

  const fitMap = (points) => {
    if (!mapRef.current || !points?.length) return;
    setTimeout(() => {
      mapRef.current.fitToCoordinates(points, {
        edgePadding: { top: 80, right: 40, bottom: 280, left: 40 },
        animated: true,
      });
    }, 400);
  };

  const cancel = async () => {
    try { await updateRoutingRequest(id, 'cancelled'); } catch {}
    router.back();
  };

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        showsUserLocation
        initialRegion={{
          latitude: 33.6493,
          longitude: -117.8464,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }}
      >
        {polyline && (
          <Polyline
            coordinates={polyline}
            strokeColor={colors.green}
            strokeWidth={4}
            lineDashPattern={[0]}
          />
        )}
        {origin && (
          <Marker coordinate={origin} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={s.dotYou}>
              <Text style={s.dotLabel}>You</Text>
            </View>
          </Marker>
        )}
        {dest && (
          <Marker coordinate={dest}>
            <View style={s.pinDest}>
              <Text style={s.pinDestText}>{(targetName || '?').charAt(0).toUpperCase()}</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Back button */}
      <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
        <Text style={s.backText}>←</Text>
      </TouchableOpacity>

      {/* Status card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={s.avatar}>
  {targetAvatar ? (
    <Image source={{ uri: targetAvatar }} style={s.avatarImg} />
  ) : (
    <Text style={s.avatarText}>{(targetName || '?').charAt(0).toUpperCase()}</Text>
  )}
</View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardName}>Route to {targetName || 'User'}</Text>
            {routeMeta && (
              <Text style={s.cardSub}>{routeMeta.distance_text} · {routeMeta.duration_text}</Text>
            )}
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
                : `${targetName || 'They'} accepted — route active`}
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
  container:     { flex: 1 },
  map:           { flex: 1 },
  backBtn:       { position: 'absolute', top: 60, left: 16,
                   backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 22,
                   width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                   shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  backText:      { fontSize: 22, color: colors.ink },
  dotYou:        { backgroundColor: colors.green, borderRadius: 99, paddingHorizontal: 8,
                   paddingVertical: 4, borderWidth: 2, borderColor: '#fff' },
  dotLabel:      { color: '#fff', fontWeight: '700', fontSize: 11 },
  pinDest:       { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.green,
                   alignItems: 'center', justifyContent: 'center',
                   borderWidth: 3, borderColor: '#fff',
                   shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  pinDestText:   { color: '#fff', fontWeight: '800', fontSize: 18 },
  card:          { position: 'absolute', bottom: 90, left: 12, right: 12,
                   backgroundColor: '#fff', borderRadius: 24, padding: 16,
                   shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 16, elevation: 8 },
  cardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  avatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.green,
                   alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontWeight: '800', fontSize: 20 },
  cardName:      { fontSize: 18, fontWeight: '800', color: colors.ink },
  cardSub:       { fontSize: 13, color: colors.ink3, marginTop: 2 },
  statusDot:     { width: 10, height: 10, borderRadius: 5 },
  statusBanner:  { borderRadius: 12, padding: 12, marginBottom: 14, alignItems: 'center' },
  statusText:    { fontSize: 14, color: colors.ink2, fontWeight: '500', textAlign: 'center' },
  actions:       { flexDirection: 'row', gap: 8 },
  btnSoft:       { flex: 1, backgroundColor: colors.cream, borderRadius: 14, padding: 14,
                   alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  btnSoftText:   { color: colors.ink2, fontWeight: '600', fontSize: 15 },
  btnPrimary:    { flex: 1, backgroundColor: colors.green, borderRadius: 14, padding: 14, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  avatarImg: { width: 48, height: 48, borderRadius: 24 },
});