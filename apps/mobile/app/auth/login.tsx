import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';

export default function LoginScreen() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{ email?: string; password?: string }>({});

  const { signInWithEmail, signInWithGoogle, isLoading, error, clearError } = useAuthStore();

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim())           e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password)               e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    clearError();
    if (!validate()) return;
    try {
      await signInWithEmail(email.trim().toLowerCase(), password);
      router.replace('/(tabs)/discover');
    } catch { /* error shown from store */ }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-12"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo block */}
          <View className="items-center mb-12">
            <View className="w-20 h-20 rounded-3xl bg-green-500/10 border border-green-500/30 items-center justify-center mb-5">
              <Text className="text-5xl">🥾</Text>
            </View>
            <Text className="text-3xl font-bold text-white tracking-tight">RoamFree</Text>
            <Text className="text-gray-400 mt-1.5 text-base">Outdoor navigation, truly free</Text>
          </View>

          {/* Error banner */}
          {error && (
            <View className="bg-red-950 border border-red-800 rounded-xl px-4 py-3 mb-5">
              <Text className="text-sm text-red-400">{error}</Text>
            </View>
          )}

          {/* Fields */}
          <View className="gap-y-4">
            <DarkInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />

            <DarkInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />

            <Link href="/auth/forgot-password" className="self-end -mt-1">
              <Text className="text-sm text-green-400">Forgot password?</Text>
            </Link>

            <PrimaryButton
              label="Sign in"
              onPress={handleLogin}
              isLoading={isLoading}
            />
          </View>

          {/* Divider */}
          <View className="flex-row items-center gap-x-3 my-6">
            <View className="flex-1 h-px bg-gray-800" />
            <Text className="text-gray-600 text-sm">or</Text>
            <View className="flex-1 h-px bg-gray-800" />
          </View>

          {/* Google OAuth */}
          <GoogleButton onPress={signInWithGoogle} isLoading={isLoading} />

          {/* Sign up link */}
          <View className="items-center mt-10">
            <Text className="text-gray-400 text-sm">
              New to RoamFree?{' '}
              <Link href="/auth/signup">
                <Text className="text-green-400 font-semibold">Create free account</Text>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function DarkInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className="bg-gray-900 border-gray-700 text-white"
    />
  );
}

function PrimaryButton({
  label,
  onPress,
  isLoading,
}: {
  label: string;
  onPress: () => void;
  isLoading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="bg-green-500 active:bg-green-600 rounded-xl py-3.5 items-center mt-1 disabled:opacity-50"
    >
      <Text className="text-gray-950 font-bold text-base">
        {isLoading ? 'Signing in…' : label}
      </Text>
    </Pressable>
  );
}

function GoogleButton({
  onPress,
  isLoading,
}: {
  onPress: () => void;
  isLoading: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      className="flex-row items-center justify-center gap-x-3 border border-gray-700 rounded-xl py-3.5 active:bg-gray-900 disabled:opacity-50"
    >
      <Text className="text-xl">G</Text>
      <Text className="text-white font-semibold text-base">Continue with Google</Text>
    </Pressable>
  );
}
