// app/(tabs)/_layout.jsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/theme';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerShown:     false,
      tabBarActiveTintColor:   colors.green,
      tabBarInactiveTintColor: colors.ink3,
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor:  colors.line,
        paddingBottom:   8,
        height:          80,
      },
      tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
    }}>
      <Tabs.Screen name="map"   options={{ title: 'Map',  tabBarIcon: ({ color, size }) => <Ionicons name="map-outline"          size={size} color={color} /> }} />
      <Tabs.Screen name="videos" options={{ title: 'Vids', tabBarIcon: ({ color, size }) => <Ionicons name="videocam-outline"     size={size} color={color} /> }} />
      <Tabs.Screen name="chat"  options={{ title: 'Chat', tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline"   size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'You', tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
