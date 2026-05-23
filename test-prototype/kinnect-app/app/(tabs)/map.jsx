// app/(tabs)/map.jsx
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ScrollView, Modal, Pressable, ActivityIndicator, TextInput,
  Animated, PanResponder,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import {
  getNearbyUsers, updateLocation, createRoutingRequest,
  createRoom, getUserTags, getUserById,
} from '../../services/api';
import { connectGateway, getGatewaySocket } from '../../services/socket';
import { useAuth } from '../../services/auth';
import { colors, TAG_LIBRARY, catFor, catColor, tintFor, shadeFor } from '../../constants/theme';

// ── TagWithSubs ────────────────────────────────────────────────
function TagWithSubs({ tag, subtags = [], cat }) {
  const color = catColor(cat || catFor(tag));
  return (
    <View style={[tw.row, { borderColor: color }]}>
      <View style={[tw.pill, { backgroundColor: color }]}>
        <Text style={tw.pillText}>{tag}</Text>
      </View>
      {subtags.length === 0 ? (
        <Text style={tw.noSpec}>no specifics</Text>
      ) : subtags.map(s => (
        <View key={s} style={[tw.sub, { backgroundColor: tintFor(color) }]}>
          <Text style={[tw.subText, { color: shadeFor(cat || catFor(tag)) }]}>#{s}</Text>
        </View>
      ))}
    </View>
  );
}
const tw = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5,
             backgroundColor: '#fff', borderWidth: 1.5, borderRadius: 12,
             paddingVertical: 6, paddingLeft: 6, paddingRight: 10 },
  pill:    { borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4 },
  pillText:{ color: '#fff', fontWeight: '600', fontSize: 12 },
  noSpec:  { fontSize: 11, color: colors.ink3, fontStyle: 'italic' },
  sub:     { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  subText: { fontSize: 11, fontWeight: '500' },
});

// ── UserPreviewSheet ───────────────────────────────────────────
function UserPreviewSheet({ person, onClose, onChat, onRoute, onProfile }) {
  const [tags,    setTags]    = useState([]);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (!person) return;
    setTags([]);
    setProfile(null);
    getUserById(person.user_id).then(r => setProfile(r.data)).catch(() => {});
    getUserTags(person.user_id).then(r => setTags(r.data?.tags ?? [])).catch(() => {});
  }, [person?.user_id]);

  if (!person) return null;
  const isAnon   = person.is_anonymous;
  const name     = isAnon ? 'Anonymous' : (person.display_name || 'Unknown');
  const initials = isAnon ? '?' : name.split(' ').map(w => w[0]).join('').slice(0, 2);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ps.overlay} onPress={onClose}>
        <Pressable style={ps.sheet} onPress={() => {}}>
          <View style={ps.grab} />
          <View style={ps.header}>
            <View style={[ps.avatar, { backgroundColor: isAnon ? colors.ink3 : colors.green }]}>
              <Text style={ps.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ps.name}>{name}</Text>
              <Text style={ps.dist}>📍 {person.distance_km?.toFixed(1)} km away</Text>
            </View>
          </View>
          {!isAnon && (profile?.bio || person.bio) ? (
            <Text style={ps.bio} numberOfLines={2}>{profile?.bio || person.bio}</Text>
          ) : null}
          {tags.length > 0 && (
            <View style={ps.tags}>
              {tags.slice(0, 4).map(t => (
                <TagWithSubs key={t.id} tag={t.name} subtags={[]} cat={t.category} />
              ))}
            </View>
          )}
          <View style={ps.actions}>
            <TouchableOpacity style={ps.btnPrimary} onPress={onChat}>
              <Text style={ps.btnPrimaryText}>Say hi 👋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ps.btnSoft} onPress={onRoute}>
              <Text style={ps.btnSoftText}>Navigate →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={ps.btnSoft} onPress={onProfile}>
              <Text style={ps.btnSoftText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const ps = StyleSheet.create({
  overlay:       { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,32,25,0.3)' },
  sheet:         { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                   padding: 20, paddingBottom: 40 },
  grab:          { width: 36, height: 4, backgroundColor: colors.line, borderRadius: 99,
                   alignSelf: 'center', marginBottom: 16 },
  header:        { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 },
  avatar:        { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontWeight: '800', fontSize: 24 },
  name:          { fontSize: 24, fontWeight: '800', color: colors.ink },
  dist:          { fontSize: 13, color: colors.ink3, marginTop: 2 },
  bio:           { fontSize: 14, color: colors.ink2, lineHeight: 20, marginBottom: 12 },
  tags:          { gap: 6, marginBottom: 16 },
  actions:       { flexDirection: 'row', gap: 8, marginTop: 4 },
  btnPrimary:    { flex: 1, backgroundColor: colors.green, borderRadius: 14,
                   paddingVertical: 14, alignItems: 'center' },
  btnPrimaryText:{ color: '#fff', fontWeight: '700', fontSize: 15 },
  btnSoft:       { backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14,
                   paddingHorizontal: 16, alignItems: 'center',
                   borderWidth: 1, borderColor: colors.line },
  btnSoftText:   { color: colors.ink2, fontWeight: '600', fontSize: 14 },
});

// ── CreateChatSheet ────────────────────────────────────────────
function CreateChatSheet({ nearbyUsers, myUserId, onClose, onCreated }) {
  const [name,     setName]     = useState('');
  const [selected, setSelected] = useState(new Set());
  const [creating, setCreating] = useState(false);

  const toggle = (userId) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(userId) ? n.delete(userId) : n.add(userId);
      return n;
    });
  };

  const create = async () => {
    if (selected.size === 0) { Alert.alert('Select people', 'Pick at least one person.'); return; }
    setCreating(true);
    try {
      const memberIds = [...selected, myUserId];
      const isGroup   = selected.size > 1;
      const res = await createRoom({
  type:       isGroup ? 'group' : 'dm',
  name:       isGroup ? (name.trim() || 'Nearby group') : undefined,
  member_ids: [...selected].filter(id => id !== myUserId),
});
      onCreated(res.data.id || res.data.room?.id);
    } catch {
      Alert.alert('Error', 'Could not create chat. Try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={cc.overlay} onPress={onClose}>
        <Pressable style={cc.sheet} onPress={() => {}}>
          <View style={cc.grab} />
          <Text style={cc.title}>Start a chat</Text>
          <Text style={cc.sub}>Pick people nearby. Select more than one for a group.</Text>
          {selected.size > 1 && (
            <TextInput
              style={cc.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Group name (optional)"
              placeholderTextColor={colors.ink3}
            />
          )}
          <ScrollView style={cc.list} showsVerticalScrollIndicator={false}>
            {nearbyUsers.length === 0
              ? <Text style={cc.empty}>No one nearby to chat with.</Text>
              : nearbyUsers.map(u => {
                  const isSelected = selected.has(u.user_id);
                  const uName   = u.is_anonymous ? 'Anonymous' : (u.display_name || 'Unknown');
                  const uTags   = (u.tags || []).map(t => t.name || t);
                  return (
                    <TouchableOpacity
                      key={u.user_id}
                      style={[cc.person, isSelected && cc.personSelected]}
                      onPress={() => toggle(u.user_id)}
                    >
                      <View style={[cc.personAvatar, {
                        backgroundColor: isSelected ? colors.green : (u.is_anonymous ? colors.ink3 : colors.peach),
                      }]}>
                        <Text style={cc.personAvatarText}>{u.is_anonymous ? '?' : uName[0].toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={cc.personName}>{uName}</Text>
                        <Text style={cc.personDist}>{u.distance_km?.toFixed(1)} km away</Text>
                        {uTags.length > 0 && <Text style={cc.personTags} numberOfLines={1}>{uTags.join(', ')}</Text>}
                      </View>
                      <View style={[cc.check, isSelected && cc.checkSelected]}>
                        {isSelected && <Text style={cc.checkText}>✓</Text>}
                      </View>
                    </TouchableOpacity>
                  );
                })}
          </ScrollView>
          <TouchableOpacity
            style={[cc.createBtn, (selected.size === 0 || creating) && cc.createBtnDisabled]}
            onPress={create}
            disabled={selected.size === 0 || creating}
          >
            {creating
              ? <ActivityIndicator color="#fff" />
              : <Text style={cc.createBtnText}>
                  {selected.size === 0 ? 'Select people' : selected.size === 1 ? 'Start DM' : `Start group (${selected.size})`}
                </Text>}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
const cc = StyleSheet.create({
  overlay:          { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,32,25,0.35)' },
  sheet:            { backgroundColor: colors.cream, borderTopLeftRadius: 24, borderTopRightRadius: 24,
                      padding: 20, paddingBottom: 36, maxHeight: '80%' },
  grab:             { width: 36, height: 4, backgroundColor: colors.line, borderRadius: 99,
                      alignSelf: 'center', marginBottom: 16 },
  title:            { fontSize: 24, fontWeight: '800', color: colors.ink, marginBottom: 4 },
  sub:              { fontSize: 13, color: colors.ink3, marginBottom: 16, lineHeight: 18 },
  nameInput:        { backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.green,
                      borderRadius: 14, padding: 12, fontSize: 15, color: colors.ink, marginBottom: 12 },
  list:             { maxHeight: 300, marginBottom: 16 },
  person:           { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12,
                      backgroundColor: '#fff', borderRadius: 14, marginBottom: 8,
                      borderWidth: 1.5, borderColor: colors.line },
  personSelected:   { borderColor: colors.green, backgroundColor: 'rgba(11,110,79,0.04)' },
  personAvatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  personAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  personName:       { fontSize: 15, fontWeight: '600', color: colors.ink },
  personDist:       { fontSize: 11, color: colors.ink3, fontFamily: 'monospace', marginTop: 1 },
  personTags:       { fontSize: 11, color: colors.ink3, marginTop: 2 },
  check:            { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5,
                      borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkSelected:    { backgroundColor: colors.green, borderColor: colors.green },
  checkText:        { color: '#fff', fontWeight: '700', fontSize: 13 },
  empty:            { textAlign: 'center', color: colors.ink3, fontSize: 14, padding: 24 },
  createBtn:        { backgroundColor: colors.green, borderRadius: 14, padding: 16, alignItems: 'center' },
  createBtnDisabled:{ opacity: 0.5 },
  createBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ── NearbySheet — animated pull-up ────────────────────────────
const COLLAPSED   = 100;
const EXPANDED    = 300;
const TAB_BAR_H   = 0; // actual tab bar height on iPhone

function NearbySheet({ people, onTap, onTagFilter, activeTag, onCreateChat }) {
  const animHeight = useRef(new Animated.Value(COLLAPSED)).current;
  const isExpanded = useRef(false);
  const lastHeight = useRef(COLLAPSED);

  // Only show parent tags (ones that exist in TAG_LIBRARY), not subtags
  const parentTagNames = new Set(Object.values(TAG_LIBRARY).flat());
  const allTags = [...new Set(
    people.flatMap(u => (u.tags || []).map(t => t.name || t).filter(n => parentTagNames.has(n)))
  )].slice(0, 10);

  const snapTo = (expand) => {
    isExpanded.current = expand;
    Animated.spring(animHeight, {
      toValue:         expand ? EXPANDED : COLLAPSED,
      useNativeDriver: false,
      tension:         60,
      friction:        10,
    }).start();
  };

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder:  () => true,
    onMoveShouldSetPanResponder:   (_, g) => Math.abs(g.dy) > 4,
    onPanResponderGrant: () => {
      animHeight.stopAnimation(v => { lastHeight.current = v; });
    },
    onPanResponderMove: (_, g) => {
      const next = Math.min(Math.max(lastHeight.current - g.dy, COLLAPSED), EXPANDED);
      animHeight.setValue(next);
    },
    onPanResponderRelease: (_, g) => {
      if      (g.vy < -0.3 || g.dy < -30) snapTo(true);
      else if (g.vy >  0.3 || g.dy >  30) snapTo(false);
      else                                  snapTo(isExpanded.current);
    },
  })).current;

  return (
    <Animated.View style={[ns.sheet, { height: animHeight, bottom: TAB_BAR_H }]}>
      {/* Drag handle area */}
      <View {...panResponder.panHandlers} style={ns.dragArea}>
        <View style={ns.grab} />
        <View style={ns.headerRow}>
          <Text style={ns.headline}>{people.length} nearby</Text>
          <TouchableOpacity style={ns.newChatBtn} onPress={onCreateChat}>
            <Text style={ns.newChatText}>+ Chat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tag chips */}
      {allTags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={ns.tagScroll} contentContainerStyle={ns.tagRow}>
          {allTags.map(t => (
            <TouchableOpacity key={t}
              style={[ns.tagChip, activeTag === t && ns.tagChipActive]}
              onPress={() => onTagFilter(t)}>
              <Text style={[ns.tagChipText, activeTag === t && ns.tagChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Person cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={ns.cardRow}>
        {people.length === 0
          ? <Text style={ns.empty}>No one nearby{activeTag ? ` into ${activeTag}` : ''}.</Text>
          : people.map(p => {
              const isAnon = p.is_anonymous;
              const name   = isAnon ? 'Anonymous' : (p.display_name || 'Unknown').split(' ')[0];
              return (
                <TouchableOpacity key={p.user_id} style={ns.card} onPress={() => onTap(p)}>
                  <View style={[ns.cardAvatar, { backgroundColor: isAnon ? colors.ink3 : colors.green }]}>
                    <Text style={ns.cardAvatarText}>{isAnon ? '?' : name[0].toUpperCase()}</Text>
                  </View>
                  <Text style={ns.cardName} numberOfLines={1}>{name}</Text>
                  <Text style={ns.cardDist}>{p.distance_km?.toFixed(1)} km</Text>
                </TouchableOpacity>
              );
            })}
      </ScrollView>
    </Animated.View>
  );
}
const ns = StyleSheet.create({
  sheet:            { position: 'absolute', left: 0, right: 0, zIndex: 20,
                      backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
                      overflow: 'hidden',
                      shadowColor: '#000', shadowOpacity: 0.10, shadowRadius: 16, elevation: 8 },
  dragArea:         { paddingTop: 10, paddingBottom: 6 },
  grab:             { width: 36, height: 4, backgroundColor: colors.line, borderRadius: 99,
                      alignSelf: 'center', marginBottom: 10 },
  headerRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                      paddingHorizontal: 18, marginBottom: 4 },
  headline:         { fontSize: 18, fontWeight: '800', color: colors.ink },
  newChatBtn:       { backgroundColor: colors.green, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 6 },
  newChatText:      { color: '#fff', fontWeight: '700', fontSize: 13 },
  tagScroll:        { marginBottom: 6 },
  tagRow:           { paddingHorizontal: 18, gap: 6 },
  tagChip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99,
                      backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line,
                      alignSelf: 'flex-start' },
  tagChipActive:    { backgroundColor: colors.green, borderColor: colors.green },
  tagChipText:      { fontSize: 12, color: colors.ink2, fontWeight: '500' },
  tagChipTextActive:{ color: '#fff', fontWeight: '700' },
  cardRow:          { paddingHorizontal: 18, gap: 10, paddingBottom: 8 },
  card:             { width: 100, backgroundColor: colors.cream, borderRadius: 14, padding: 10,
                      alignItems: 'center', borderWidth: 1, borderColor: colors.line },
  cardAvatar:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardAvatarText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
  cardName:         { marginTop: 8, fontSize: 13, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  cardDist:         { fontSize: 10, color: colors.ink3, fontFamily: 'monospace', marginTop: 2 },
  empty:            { paddingVertical: 20, paddingHorizontal: 4, color: colors.ink3, fontSize: 13 },
});

// ── Main screen ────────────────────────────────────────────────
// Wrapper remounts inner map whenever user changes
export default function MapScreen() {
  const { user } = useAuth();
  return <MapScreenInner key={user?.id ?? 'logged-out'} user={user} />;
}

function MapScreenInner({ user }) {
  const router   = useRouter();
  const mapRef   = useRef(null);

  const [myLocation,     setMyLocation]     = useState(null);
  const [nearbyUsers,    setNearbyUsers]     = useState([]);
  const [radiusKm,       setRadiusKm]        = useState(user?.radius_km || 2);
  const [selectedUser,   setSelectedUser]    = useState(null);
  const [tagFilter,      setTagFilter]       = useState(null);
  const [showCreateChat, setShowCreateChat]  = useState(false);
  const [loading,        setLoading]         = useState(true);
  const [delta,          setDelta]           = useState(0.02);


  useEffect(() => {
    let locationSub;
    let interval;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location required', 'Kinnect needs your location to show nearby people.');
        setLoading(false);
        return;
      }

      const socket = await connectGateway();
      socket.off('nearby_user_moved');
      socket.on('nearby_user_moved', ({ user_id, lat, lng }) => {
        setNearbyUsers(prev => prev.map(u => u.user_id === user_id ? { ...u, lat, lng } : u));
      });

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude: lat, longitude: lng } = pos.coords;
      setMyLocation({ lat, lng });
      await sendLocation(lat, lng);
      await fetchNearby(lat, lng, radiusKm);
      setLoading(false);

      locationSub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20 },
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          setMyLocation({ lat, lng });
          await sendLocation(lat, lng);
        }
      );

      interval = setInterval(() => {
        if (myLocation) fetchNearby(myLocation.lat, myLocation.lng, radiusKm);
      }, 15000);
    })();

    return () => {
      locationSub?.remove();
      clearInterval(interval);
      getGatewaySocket()?.off('nearby_user_moved');
    };
  }, []);


  const sendLocation = async (lat, lng) => {
  try {
    const socket = getGatewaySocket();
    console.log('[sendLocation] socket connected:', socket?.connected, 'id:', socket?.id);
    if (socket?.connected) {
      socket.emit('location_update', { lat, lng, timestamp: Date.now() });
      console.log('[sendLocation] emitted via socket');
    } else {
      console.log('[sendLocation] socket not ready, using HTTP');
      await updateLocation(lat, lng);
    }
  } catch (err) {
    console.log('[sendLocation] error:', err.message);
  }
};

  const fetchNearby = useCallback(async (lat, lng, radius) => {
    try {
      const res = await getNearbyUsers({ radius_km: radius });
      setNearbyUsers(res.data.nearby_users || []);
    } catch {}
  }, []);

  const handleRadiusChange = (r) => {
    setRadiusKm(r);
    if (myLocation) fetchNearby(myLocation.lat, myLocation.lng, r);
  };

  const zoom = (direction) => {
    const newDelta = Math.min(Math.max(delta * (direction === 'in' ? 0.5 : 2), 0.002), 0.5);
    setDelta(newDelta);
    mapRef.current?.animateToRegion({
      latitude: myLocation.lat, longitude: myLocation.lng,
      latitudeDelta: newDelta, longitudeDelta: newDelta,
    }, 250);
  };

  const filteredUsers = tagFilter
    ? nearbyUsers.filter(u => (u.tags || []).some(t => (t.name || t) === tagFilter))
    : nearbyUsers;

  const startChat = async (person) => {
  setSelectedUser(null);
  try {
    const res = await createRoom({
      type:       'dm',
      member_ids: [person.user_id],
    });
    console.log('createRoom response:', JSON.stringify(res.data));
    const roomId = res.data.id;
    router.push(`/chat/${roomId}`);
  } catch (err) {
    console.log('createRoom error:', err.message, JSON.stringify(err.response?.data));
    Alert.alert('Error', 'Could not start chat. Try again.');
  }
};

  const requestRoute = async (person) => {
    setSelectedUser(null);
    try {
      const res = await createRoutingRequest(person.user_id);
      getGatewaySocket()?.emit('routing_request_notify', {
        target_user_id: person.user_id, routing_request_id: res.data.id,
      });
      router.push({ pathname: '/routing/[id]', params: { id: res.data.id, targetName: person.display_name || 'Anonymous' } });
    } catch {
      Alert.alert('Error', 'Could not send routing request.');
    }
  };

  const handleChatCreated = (roomId) => {
    setShowCreateChat(false);
    router.push(`/chat/${roomId}`);
  };

  if (!myLocation) {
    return (
      <View style={s.loading}>
        {loading
          ? <ActivityIndicator color={colors.green} size="large" />
          : <Text style={s.loadingText}>Location unavailable</Text>}
      </View>
    );
  }

  return (
    <View style={s.container}>
      <MapView
        ref={mapRef}
        style={s.map}
        initialRegion={{
          latitude: myLocation.lat, longitude: myLocation.lng,
          latitudeDelta: delta, longitudeDelta: delta,
        }}
        onRegionChangeComplete={(r) => setDelta(r.latitudeDelta)}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Circle
          center={{ latitude: myLocation.lat, longitude: myLocation.lng }}
          radius={radiusKm * 1000}
          fillColor="rgba(11,110,79,0.08)"
          strokeColor="rgba(11,110,79,0.35)"
          strokeWidth={1.5}
        />
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

      {/* Top bar */}
      <View style={s.topBar}>
        <TouchableOpacity style={s.topPill}>
          <Text style={s.topPillIcon}>⚡</Text>
          {tagFilter ? (
            <>
              <Text style={s.topPillLabel}>filter: </Text>
              <Text style={s.topPillValue}>{tagFilter}</Text>
              <TouchableOpacity onPress={() => setTagFilter(null)} style={s.clearFilter}>
                <Text style={s.clearFilterText}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <Text style={s.topPillPlaceholder}>Filter by interest…</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.ghostBtn, user?.is_anonymous && { backgroundColor: colors.peach }]}
          onPress={() => router.push('/settings/privacy')}
        >
          <Text style={s.ghostBtnText}>👻</Text>
        </TouchableOpacity>
      </View>

      {/* Zoom controls */}
      <View style={s.zoomBtns}>
        <TouchableOpacity style={s.zoomBtn} onPress={() => zoom('in')}>
          <Text style={s.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <View style={s.zoomDivider} />
        <TouchableOpacity style={s.zoomBtn} onPress={() => zoom('out')}>
          <Text style={s.zoomBtnText}>−</Text>
        </TouchableOpacity>
      </View>

      {/* Radius bar — sits just above the collapsed sheet */}
      <View style={s.radiusBar}>
        <Text style={s.radiusLabel}>RADIUS</Text>
        <Text style={s.radiusValue}>{radiusKm.toFixed(1)} km · {filteredUsers.length} people</Text>
        <View style={s.radiusBtns}>
          {[0.5, 1, 2, 3].map(r => (
            <TouchableOpacity key={r}
              style={[s.radiusBtn, radiusKm === r && s.radiusBtnActive]}
              onPress={() => handleRadiusChange(r)}>
              <Text style={[s.radiusBtnText, radiusKm === r && { color: '#fff' }]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Pull-up nearby sheet */}
      <NearbySheet
        people={filteredUsers}
        onTap={setSelectedUser}
        onTagFilter={(t) => setTagFilter(t === tagFilter ? null : t)}
        activeTag={tagFilter}
        onCreateChat={() => setShowCreateChat(true)}
      />

      {/* User preview */}
      <UserPreviewSheet
        person={selectedUser}
        onClose={() => setSelectedUser(null)}
        onChat={() => startChat(selectedUser)}
        onRoute={() => requestRoute(selectedUser)}
        onProfile={() => { setSelectedUser(null); router.push(`/profile/${selectedUser.user_id}`); }}
      />

      {/* Create chat */}
      {showCreateChat && (
        <CreateChatSheet
          nearbyUsers={nearbyUsers}
          myUserId={user?.id}
          onClose={() => setShowCreateChat(false)}
          onCreated={handleChatCreated}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1 },
  map:                { flex: 1 },
  loading:            { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  loadingText:        { color: colors.ink3, fontSize: 16 },
  pin:                { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                        borderWidth: 2.5, borderColor: '#fff',
                        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
  pinText:            { color: '#fff', fontWeight: '800', fontSize: 13 },
  topBar:             { position: 'absolute', top: 56, left: 12, right: 12, zIndex: 10,
                        flexDirection: 'row', gap: 8, alignItems: 'center' },
  topPill:            { flex: 1, height: 44, backgroundColor: 'rgba(255,255,255,0.92)',
                        borderRadius: 22, borderWidth: 1, borderColor: 'rgba(20,32,25,0.06)',
                        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 6,
                        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  topPillIcon:        { fontSize: 15 },
  topPillPlaceholder: { fontSize: 14, color: colors.ink3 },
  topPillLabel:       { fontSize: 14, color: colors.ink3 },
  topPillValue:       { fontSize: 14, fontWeight: '700', color: colors.ink },
  clearFilter:        { marginLeft: 'auto', padding: 4 },
  clearFilterText:    { color: colors.ink3, fontSize: 14 },
  ghostBtn:           { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.92)',
                        alignItems: 'center', justifyContent: 'center',
                        shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  ghostBtnText:       { fontSize: 20 },
  zoomBtns:           { position: 'absolute', right: 16, top: '42%', zIndex: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 14,
                        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  zoomBtn:            { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  zoomBtnText:        { fontSize: 26, fontWeight: '300', color: colors.ink, lineHeight: 30 },
  zoomDivider:        { height: 1, backgroundColor: colors.line, marginHorizontal: 8 },
  // Radius bar sits TAB_BAR_H + COLLAPSED above bottom
  radiusBar:          { position: 'absolute', bottom: 100 + 12, left: 16, right: 16, zIndex: 12,
                        backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 12,
                        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  radiusLabel:        { fontSize: 11, fontWeight: '700', color: colors.ink3,
                        fontFamily: 'monospace', letterSpacing: 1 },
  radiusValue:        { fontSize: 13, color: colors.ink, fontFamily: 'monospace', marginBottom: 8 },
  radiusBtns:         { flexDirection: 'row', gap: 6 },
  radiusBtn:          { flex: 1, paddingVertical: 7, borderRadius: 99, backgroundColor: colors.cream,
                        borderWidth: 1, borderColor: colors.line, alignItems: 'center' },
  radiusBtnActive:    { backgroundColor: colors.green, borderColor: colors.green },
  radiusBtnText:      { fontSize: 13, fontWeight: '600', color: colors.ink2 },
});