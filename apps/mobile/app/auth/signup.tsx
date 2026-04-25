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

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  const { signUpWithEmail, isLoading, error, clearError } = useAuthStore();

  const validate = () => {
    const e: typeof errors = {};
    if (!username.trim())              e.username = 'Username is required';
    else if (username.length < 3)      e.username = 'At least 3 characters';
    else if (!/^[a-z0-9_]+$/i.test(username)) e.username = 'Letters, numbers and _ only';
    if (!email.trim())                 e.email    = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password)                     e.password = 'Password is required';
    else if (password.length < 8)      e.password = 'At least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSignUp = async () => {
    clearError();
    if (!validate()) return;
    try {
      await signUpWithEmail(
        email.trim().toLowerCase(),
        password,
        username.trim().toLowerCase()
      );
      // Root layout detects isNewUser → redirects to profile-setup
      router.replace('/auth/profile-setup');
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
          {/* Header */}
          <View className="items-center mb-10">
            <Text className="text-3xl font-bold text-white">Create account</Text>
            <Text className="text-gray-400 mt-1.5 text-base text-center">
              Free forever — no credit card needed
            </Text>
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
              label="Username"
              value={username}
              onChangeText={setUsername}
              error={errors.username}
              placeholder="trailrunner42"
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
            />

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
              placeholder="Min. 8 characters"
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <Pressable
              onPress={handleSignUp}
              disabled={isLoading}
              className="bg-green-500 active:bg-green-600 rounded-xl py-3.5 items-center mt-1 disabled:opacity-50"
            >
              <Text className="text-gray-950 font-bold text-base">
                {isLoading ? 'Creating account…' : 'Create free account'}
              </Text>
            </Pressable>
          </View>

          {/* Free features list */}
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mt-6 gap-y-2">
            <Text className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1">
              Always free
            </Text>
            {[
              'Unlimited route planning',
              'GPX export — no paywall, ever',
              'Device sync (Garmin, Wahoo)',
              'Heart rate, cadence & power sensors',
              'Community route discovery',
            ].map((item) => (
              <View key={item} className="flex-row items-center gap-x-2">
                <Text className="text-green-400 text-sm">✓</Text>
                <Text className="text-gray-300 text-sm">{item}</Text>
              </View>
            ))}
          </View>

          {/* Sign in link */}
          <View className="items-center mt-8">
            <Text className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link href="/auth/login">
                <Text className="text-green-400 font-semibold">Sign in</Text>
              </Link>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DarkInput(props: React.ComponentProps<typeof Input>) {
  return <Input {...props} className="bg-gray-900 border-gray-700 text-white" />;
}
