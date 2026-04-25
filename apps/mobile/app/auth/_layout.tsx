import * as WebBrowser from 'expo-web-browser';
import { Stack } from 'expo-router';

// Required for OAuth redirect handling on Android
WebBrowser.maybeCompleteAuthSession();

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#030712' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="profile-setup" />
    </Stack>
  );
}
