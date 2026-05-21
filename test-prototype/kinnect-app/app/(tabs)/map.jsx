// app/(tabs)/map.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView, Modal } from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { getNearbyUsers, updateLocation, createRoutingRequest } from '../../services/api';
import { connectGateway, getGatewaySocket } from '../../services/socket';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

export default function MapScreen() {
  const { user } = useAuth();
  const router   = useRouter();
  const mapRef   = useRef(null);

  const [myLocation,   setMyLocation]   = useState(null);
  const [nearbyUsers,  setNearbyUsers]  = useState([]);
  const [radiusKm,     setRadiusKm]     = useState(user?.radius_km || 2);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading,      setLoading]      = useState(true);

  // Start GPS + connect WebSocket on mount
  useEffect(() => {
    let locationSub;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location required', 'Kinnect needs your location to show nearby people.');
        setLoading(false);
        return;
      }

      // Get initial position
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      setMyLocation({ lat, lng });
      await sendLocation(lat, lng);
      await fetchNearby(lat, lng);
      setLoading(false);

      // Watch position — send update every move
      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setMyLocation({ lat, lng });
          await sendLocation(lat, lng);
        }
      );

      // Connect gateway WebSocket for live nearby_user_moved events
      const socket = await connectGateway();
      socket.on('nearby_user_moved', ({ user_id, lat, lng }) => {
        setNearbyUsers(prev =>
          prev.map(u => u.user_id === user_id ? { ...u, lat, lng } : u)
        );
      });
    })();

    // Refresh nearby every 15s
    const interval = setInterval(() => {
      if (myLocation) fetchNearby(myLocation.lat, myLocation.lng);
    }, 15000);

    return () => {
      locationSub?.remove();
      clearInterval(interval);
      getGatewaySocket()?.off('nearby_user_moved');
    };
  }, []);

  const sendLocation = async (lat, lng) => {
    try { await updateLocation(lat, lng); } catch {}
  };

  const fetchNearby = useCallback(async (lat, lng) => {
    try {
      const res = await getNearbyUsers({ radius_km: radiusKm });
      setNearbyUsers(res.data.nearby_users || []);
    } catch {}
  }, [radiusKm]);

  const startChat = async (person) => {
    setSelectedUser(null);
    router.push({ pathname: '/chat/new', params: { withUserId: person.user_id, name: person.display_name || 'Anonymous' } });
  };

  const requestRoute = async (person) => {
    setSelectedUser(null);
    try {
      const res = await createRoutingRequest(person.user_id);
      // Notify via gateway WebSocket
      getGatewaySocket()?.emit('routing_request_notify', {
        target_user_id:     person.user_id,
        routing_request_id: res.data.id,
      });
      router.push({ pathname: '/routing/[id]', params: { id: res.data.id, targetName: person.display_name || 'Anonymous' } });
    } catch {
      Alert.alert('Error', 'Could not send routing request.');
    }
  };

  if (!myLocation) {
    return (
      <View style={s.loading}>
        <Text style={s.loadingText}>{loading ? 'Getting your location…' : 'Location unavailable'}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={{
          latitude:        myLocation.lat,
          longitude:       myLocation.lng,
          latitudeDelta:   0.02,
          longitudeDelta:  0.02,
        }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Radius circle */}
        <Circle
          center={{ latitude: myLocation.lat, longitude: myLocation.lng }}
          radius={radiusKm * 1000}
          fillColor="rgba(11,110,79,0.08)"
          strokeColor="rgba(11,110,79,0.35)"
          strokeWidth={1.5}
        />

        {/* Nearby user pins */}
        {nearbyUsers.map(person => (
          <Marker
            key={person.user_id}
            coordinate={{ latitude: person.lat, longitude: person.lng }}
            onPress={() => setSelectedUser(person)}
          >
            <View style={[s.pin, { backgroundColor: person.is_anonymous ? colors.ink3 : colors.green }]}>
              <Text style={s.pinText}>
                {person.is_anonymous ? '?' : (person.display_name || '?').split(' ').map(w => w[0]).join('').slice(0, 2)}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* Nearby count pill */}
      <View style={s.pill}>
        <Text style={s.pillText}>{nearbyUsers.length} nearby · {radiusKm.toFixed(1)} km</Text>
      </View>

      {/* Radius slider (simple buttons) */}
      <View style={s.radiusBar}>
        <Text style={s.radiusLabel}>Radius</Text>
        {[0.5, 1, 2, 3].map(r => (
          <TouchableOpacity key={r}
            style={[s.radiusBtn, radiusKm === r && s.radiusBtnActive]}
            onPress={() => { setRadiusKm(r); fetchNearby(myLocation.lat, myLocation.lng); }}>
            <Text style={[s.radiusBtnText, radiusKm === r && { color: '#fff' }]}>{r} km</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Nearby users sheet */}
      {nearbyUsers.length > 0 && (
        <ScrollView horizontal style={s.nearbySheet} contentContainerStyle={s.nearbyRow} showsHorizontalScrollIndicator={false}>
          {nearbyUsers.map(p => (
            <TouchableOpacity key={p.user_id} style={s.nearbyCard} onPress={() => setSelectedUser(p)}>
              <View style={[s.nearbyAvatar, { backgroundColor: p.is_anonymous ? colors.ink3 : colors.green }]}>
                <Text style={s.nearbyAvatarText}>
                  {p.is_anonymous ? '?' : (p.display_name || '?').charAt(0)}
                </Text>
              </View>
              <Text style={s.nearbyName} numberOfLines={1}>{p.is_anonymous ? 'Anon' : (p.display_name || 'Unknown').split(' ')[0]}</Text>
              <Text style={s.nearbyDist}>{p.distance_km?.toFixed(1)} km</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* User detail modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide" onRequestClose={() => setSelectedUser(null)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSelectedUser(null)}>
          {selectedUser && (
            <View style={s.sheet}>
              <View style={s.grab} />
              <View style={s.sheetHeader}>
                <View style={[s.sheetAvatar, { backgroundColor: selectedUser.is_anonymous ? colors.ink3 : colors.green }]}>
                  <Text style={s.sheetAvatarText}>
                    {selectedUser.is_anonymous ? '?' : (selectedUser.display_name || '?').charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.sheetName}>{selectedUser.is_anonymous ? 'Anonymous' : (selectedUser.display_name || 'Unknown')}</Text>
                  <Text style={s.sheetDist}>📍 {selectedUser.distance_km?.toFixed(1)} km away</Text>
                </View>
              </View>

              {selectedUser.tags?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {selectedUser.tags.map(t => (
                    <View key={t.name} style={s.tagChip}>
                      <Text style={s.tagChipText}>{t.name}</Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              <View style={s.sheetActions}>
                <TouchableOpacity style={s.btnPrimary} onPress={() => startChat(selectedUser)}>
                  <Text style={s.btnPrimaryText}>Say hi 👋</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSoft} onPress={() => requestRoute(selectedUser)}>
                  <Text style={s.btnSoftText}>Navigate →</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSoft}
                  onPress={() => { setSelectedUser(null); router.push(`/profile/${selectedUser.user_id}`); }}>
                  <Text style={s.btnSoftText}>Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1 },
  map:             { flex: 1 },
  loading:         { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  loadingText:     { color: colors.ink3, fontSize: 16 },
  pin:             { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                     borderWidth: 2.5, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  pinText:         { color: '#fff', fontWeight: '800', fontSize: 13 },
  pill:            { position: 'absolute', top: 60, alignSelf: 'center',
                     backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8,
                     shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  pillText:        { fontFamily: 'monospace', fontSize: 12, color: colors.ink2 },
  radiusBar:       { position: 'absolute', bottom: 180, left: 16, right: 16,
                     backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 12,
                     flexDirection: 'row', alignItems: 'center', gap: 8,
                     shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  radiusLabel:     { fontSize: 12, fontWeight: '700', color: colors.ink3, textTransform: 'uppercase', letterSpacing: 1 },
  radiusBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line },
  radiusBtnActive: { backgroundColor: colors.green, borderColor: colors.green },
  radiusBtnText:   { fontSize: 13, fontWeight: '600', color: colors.ink2 },
  nearbySheet:     { position: 'absolute', bottom: 90, left: 0, right: 0 },
  nearbyRow:       { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  nearbyCard:      { width: 90, backgroundColor: colors.cream, borderRadius: 14, padding: 10, alignItems: 'center',
                     borderWidth: 1, borderColor: colors.line },
  nearbyAvatar:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  nearbyAvatarText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
  nearbyName:      { marginTop: 6, fontSize: 12, fontWeight: '700', color: colors.ink },
  nearbyDist:      { fontSize: 10, color: colors.ink3, fontFamily: 'monospace' },
  modalOverlay:    { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,32,25,0.3)' },
  sheet:           { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
  grab:            { width: 36, height: 4, backgroundColor: colors.line, borderRadius: 99, alignSelf: 'center', marginBottom: 16 },
  sheetHeader:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  sheetAvatar:     { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  sheetName:       { fontSize: 22, fontWeight: '800', color: colors.ink },
  sheetDist:       { fontSize: 13, color: colors.ink3, marginTop: 2 },
  tagChip:         { backgroundColor: '#fff', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6,
                     marginRight: 6, borderWidth: 1, borderColor: colors.line },
  tagChipText:     { fontSize: 13, color: colors.ink2 },
  sheetActions:    { flexDirection: 'row', gap: 8 },
  btnPrimary:      { flex: 1, backgroundColor: colors.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnPrimaryText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSoft:         { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
                     alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  btnSoftText:     { color: colors.ink2, fontWeight: '600', fontSize: 14 },
});
