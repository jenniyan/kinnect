// app/(tabs)/videos.jsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { getNearbyVideos } from '../../services/api';
import { colors } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function Videos() {
  const router  = useRouter();
  const [videos,  setVideos]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setLoading(false); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = pos.coords;
      try {
        const res = await getNearbyVideos({ lat, lng, radius_m: 5000 });
        setVideos(res.data.videos || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headline}>Nearby Videos</Text>
        <TouchableOpacity style={s.recordBtn} onPress={() => router.push('/record')}>
          <Text style={s.recordBtnText}>+ Record</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.empty}><Text style={s.emptyText}>Loading nearby videos…</Text></View>
      ) : videos.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No videos nearby yet</Text>
          <Text style={s.emptySub}>Be the first to post one!</Text>
          <TouchableOpacity style={s.bigRecordBtn} onPress={() => router.push('/record')}>
            <Text style={s.bigRecordText}>🎥 Record now</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => v.id}
          numColumns={2}
          contentContainerStyle={s.grid}
          renderItem={({ item: v }) => (
            <TouchableOpacity style={s.card}>
              <View style={[s.thumb, { backgroundColor: colors.green + '33' }]}>
                <Text style={s.thumbIcon}>🎥</Text>
                <Text style={s.thumbDist}>{v.distance_m ? `${(v.distance_m / 1000).toFixed(1)} km` : ''}</Text>
              </View>
              <Text style={s.caption} numberOfLines={2}>{v.caption || 'No caption'}</Text>
              <Text style={s.likes}>❤️ {v.like_count || 0}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:     { flex: 1, backgroundColor: colors.cream },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  headline:      { fontSize: 30, fontWeight: '800', color: colors.ink },
  recordBtn:     { backgroundColor: colors.peach, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 8 },
  recordBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  grid:          { padding: 12, gap: 10 },
  card:          { flex: 1, margin: 4, backgroundColor: '#fff', borderRadius: 16,
                   borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  thumb:         { height: 120, alignItems: 'center', justifyContent: 'center' },
  thumbIcon:     { fontSize: 36 },
  thumbDist:     { fontFamily: 'monospace', fontSize: 10, color: colors.ink3, marginTop: 4 },
  caption:       { padding: 10, paddingBottom: 4, fontSize: 13, color: colors.ink, fontWeight: '600' },
  likes:         { paddingHorizontal: 10, paddingBottom: 10, fontSize: 12, color: colors.ink3 },
  empty:         { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText:     { fontSize: 18, fontWeight: '700', color: colors.ink2 },
  emptySub:      { fontSize: 14, color: colors.ink3 },
  bigRecordBtn:  { marginTop: 16, backgroundColor: colors.peach, borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  bigRecordText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
