// app/_layout.jsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '../services/auth';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../constants/theme';

function RootGuard() {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!user && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (user && inAuth) {
      router.replace('/(tabs)/map');
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream }}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootGuard />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)/welcome"  options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/login"    options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/signup"   options={{ headerShown: false }} />
        <Stack.Screen name="(auth)/tags"     options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]"       options={{ presentation: 'card', headerShown: false }} />
        <Stack.Screen name="routing/[id]"    options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ presentation: 'card', headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}