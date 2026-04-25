import '../global.css';
import { StripeProvider } from '@stripe/stripe-react-native';
import { SplashScreen, Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialize, session, isLoading, isNewUser } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isLoading) return;
    SplashScreen.hideAsync();

    if (!session) {
      router.replace('/auth/login');
      return;
    }

    // New user immediately after signup → finish profile before entering tabs
    if (isNewUser) {
      router.replace('/auth/profile-setup');
      return;
    }

    router.replace('/(tabs)/discover');
  }, [isLoading, session, isNewUser]);

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="profile" />
        <Stack.Screen
          name="route/[id]"
          options={{
            headerShown: true,
            title: 'Route Details',
            presentation: 'card',
            headerStyle: { backgroundColor: '#030712' },
            headerTintColor: '#4ade80',
            headerTitleStyle: { color: '#ffffff' },
          }}
        />
      </Stack>
    </StripeProvider>
  );
}
