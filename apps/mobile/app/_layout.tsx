import '../global.css';
import { SplashScreen, Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, session, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    if (!session) {
      router.replace('/auth/login');
    }
  }, [isLoading, session]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="auth" />
      <Stack.Screen
        name="route/[id]"
        options={{ headerShown: true, title: 'Route Details', presentation: 'card' }}
      />
    </Stack>
  );
}
