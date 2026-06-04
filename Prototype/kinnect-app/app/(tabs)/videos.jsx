// app/(tabs)/videos.jsx
import { useCallback, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Dimensions, ActivityIndicator, StatusBar, Image
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter, useFocusEffect } from 'expo-router';
import { getNearbyVideos, likeVideo, unlikeVideo, getUserById } from '../../services/api';
import { useAuth } from '../../services/auth';
import { colors } from '../../constants/theme';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = height;

function VideoCard({ video, isActive, onNavigate, onProfile }) {
  const [posterName, setPosterName] = useState(null);
  const [liked,      setLiked]      = useState(video.liked_by_me);
  const [likes,      setLikes]      = useState(video.like_count || 0);
  const [avatarUrl,  setAvatarUrl]  = useState(null); 

  useFocusEffect(useCallback(() => {
  if (!video.user_id) return;
  getUserById(video.user_id)
    .then(r => {
      setPosterName(r.data?.display_name || 'Unknown');
      setAvatarUrl(r.data?.avatar_url || null);
    })
    .catch(() => setPosterName('Unknown'));
}, [video.user_id]));

  const handleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes(l => next ? l + 1 : Math.max(0, l - 1));
    try {
      next ? await likeVideo(video.id) : await unlikeVideo(video.id);
    } catch {
      setLiked(!next);
      setLikes(l => next ? Math.max(0, l - 1) : l + 1);
    }
  };

  const initials = (posterName || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const dist     = video.distance_m != null ? `${(video.distance_m / 1000).toFixed(1)} km` : '';

  const tints = [
    ['#F4A26C', '#E5786A', '#0B6E4F'],
    ['#1d2a32', '#F2C94C', '#0B6E4F'],
    ['#2a2520', '#C44536', '#EC9670'],
    ['#0B6E4F', '#064a35', '#142019'],
  ];
  const tint = tints[parseInt(video.id?.replace(/-/g, '').slice(0, 8), 16) % tints.length];

  return (
    <View style={vc.container}>
      {/* Background */}
      <View style={[vc.bg, { backgroundColor: tint[2] }]}>
        <View style={[vc.bgTop,    { backgroundColor: tint[0] }]} />
        <View style={[vc.bgMiddle, { backgroundColor: tint[1] }]} />
        <View style={vc.gridH1} /><View style={vc.gridH2} />
        <View style={vc.gridV1} /><View style={vc.gridV2} />
        <View style={vc.playIcon}>
          <Text style={{ fontSize: 48, opacity: 0.5 }}>▶</Text>
        </View>
      </View>

      {/* Right actions */}
      <View style={vc.actions}>
        <TouchableOpacity style={vc.actionBtn} onPress={handleLike}>
          <Text style={{ fontSize: 26 }}>{liked ? '❤️' : '🤍'}</Text>
          <Text style={vc.actionLabel}>{likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn}>
          <Text style={{ fontSize: 24 }}>💬</Text>
          <Text style={vc.actionLabel}>0</Text>
        </TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn} onPress={onNavigate}>
          <Text style={{ fontSize: 22 }}>🗺</Text>
          <Text style={vc.actionLabel}>map</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info */}
      <View style={vc.bottomInfo}>
        <TouchableOpacity style={vc.posterRow} onPress={onProfile}>
  <View style={vc.posterAvatar}>
    {avatarUrl ? (
      <Image source={{ uri: avatarUrl }} style={vc.posterAvatarImg} />
    ) : (
      <Text style={vc.posterAvatarText}>{initials}</Text>
    )}
  </View>
  <View>
    <Text style={vc.posterName}>{posterName || '…'}</Text>
    <Text style={vc.posterDist}>📍 {dist}{dist ? ' · ' : ''}{video.lat?.toFixed(3)}, {video.lng?.toFixed(3)}</Text>
  </View>
</TouchableOpacity>
        {video.caption ? <Text style={vc.caption}>{video.caption}</Text> : null}
        {video.tags?.length > 0 && (
          <View style={vc.tagRow}>
            {video.tags.map(t => (
              <View key={t.name} style={vc.tagChip}>
                <Text style={vc.tagChipText}>#{t.name?.toLowerCase().replace(' ', '-')}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const vc = StyleSheet.create({
  container:        { width, height: ITEM_HEIGHT, backgroundColor: '#000' },
  bg:               { ...StyleSheet.absoluteFillObject },
  bgTop:            { position: 'absolute', top: 0, left: 0, right: 0, height: '50%', opacity: 0.85 },
  bgMiddle:         { position: 'absolute', top: '30%', left: 0, right: 0, height: '40%', opacity: 0.6 },
  gridH1:           { position: 'absolute', top: '33%', left: 0, right: 0, height: 1, backgroundColor: '#fff', opacity: 0.12 },
  gridH2:           { position: 'absolute', top: '66%', left: 0, right: 0, height: 1, backgroundColor: '#fff', opacity: 0.12 },
  gridV1:           { position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1, backgroundColor: '#fff', opacity: 0.12 },
  gridV2:           { position: 'absolute', top: 0, bottom: 0, left: '66%', width: 1, backgroundColor: '#fff', opacity: 0.12 },
  playIcon:         { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },
  actions:          { position: 'absolute', right: 12, bottom: 200, zIndex: 12, alignItems: 'center', gap: 20 },
  actionBtn:        { alignItems: 'center', gap: 2 },
  actionLabel:      { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
  bottomInfo:       { position: 'absolute', left: 16, right: 80, bottom: 110, zIndex: 12 },
  posterRow:        { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  posterAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.green,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  posterAvatarText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  posterName:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  posterDist:       { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 },
  caption:          { color: '#fff', fontSize: 16, lineHeight: 22, marginBottom: 8 },
  tagRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip:          { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.3)', borderRadius: 99,
                      paddingHorizontal: 10, paddingVertical: 4 },
  tagChipText:      { color: '#fff', fontSize: 12 },
  posterAvatarImg:  { width: '100%', height: '100%', borderRadius: 19 },
});

export default function Videos() {
  const { user }  = useAuth();
  const router    = useRouter();
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = pos.coords;
      const res = await getNearbyVideos({ lat, lng, radius_m: 5000 });
      setVideos(res.data.videos || []);
    } catch (err) {
      console.log('getNearbyVideos error:', err.message, err.response?.data);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { fetchVideos(); }, []));

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems[0]) setActiveIdx(viewableItems[0].index);
  }).current;

  if (loading) {
    return (
      <View style={s.loading}>
        <ActivityIndicator color={colors.green} size="large" />
        <Text style={s.loadingText}>Finding nearby posts…</Text>
      </View>
    );
  }

  if (videos.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyTitle}>Nothing nearby yet</Text>
        <Text style={s.emptySub}>Be the first to post from this location!</Text>
        <TouchableOpacity style={s.recordBtn} onPress={() => router.push('/record')}>
          <Text style={s.recordBtnText}>🎥  Record now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={videos}
        keyExtractor={v => v.id}
        renderItem={({ item, index }) => (
          <VideoCard
            video={item}
            isActive={index === activeIdx}
            onNavigate={() => router.push('/(tabs)/map')}
            onProfile={() => router.push(`/profile/${item.user_id}`)}
          />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
      />

      {/* Record FAB */}
      <TouchableOpacity style={s.fab} onPress={() => router.push('/record')}>
        <Text style={s.fabText}>🎥</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#000' },
  loading:      { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText:  { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  empty:        { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle:   { fontSize: 22, fontWeight: '800', color: colors.ink },
  emptySub:     { fontSize: 15, color: colors.ink3, textAlign: 'center', paddingHorizontal: 40 },
  recordBtn:    { marginTop: 20, backgroundColor: colors.green, borderRadius: 16, paddingHorizontal: 28, paddingVertical: 14 },
  recordBtnText:{ color: '#fff', fontWeight: '700', fontSize: 16 },
  fab:          { position: 'absolute', top: 56, right: 16, width: 44, height: 44,
                  borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)',
                  alignItems: 'center', justifyContent: 'center', zIndex: 20 },
  fabText:      { fontSize: 20 },
});