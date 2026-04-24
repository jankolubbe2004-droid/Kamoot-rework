import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuthStore } from '../../stores/authStore';

export default function SignUpScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
  }>({});

  const { signUpWithEmail, isLoading, error, clearError } = useAuthStore();

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};
    if (!username.trim()) errors.username = 'Username is required';
    else if (username.length < 3) errors.username = 'Username must be at least 3 characters';
    else if (!/^[a-z0-9_]+$/i.test(username)) errors.username = 'Only letters, numbers and underscores';
    if (!email.trim()) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) errors.email = 'Enter a valid email';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignUp = async () => {
    clearError();
    if (!validate()) return;
    try {
      await signUpWithEmail(email.trim().toLowerCase(), password, username.trim().toLowerCase());
      router.replace('/(tabs)/discover');
    } catch {
      // error is set in store
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <View className="items-center mb-10">
          <Text className="text-5xl mb-3">🥾</Text>
          <Text className="text-3xl font-bold text-gray-900">Create account</Text>
          <Text className="text-base text-gray-500 mt-1">Free forever — no credit card needed</Text>
        </View>

        <View className="gap-y-4">
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          )}

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            error={fieldErrors.username}
            placeholder="trailrunner42"
            autoCapitalize="none"
            autoComplete="username"
            textContentType="username"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={fieldErrors.email}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            placeholder="Min. 8 characters"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Button
            label="Create account"
            onPress={handleSignUp}
            isLoading={isLoading}
            fullWidth
            size="lg"
          />
        </View>

        <View className="bg-brand-50 rounded-xl p-4 mt-6 gap-y-1">
          <Text className="text-xs font-semibold text-brand-800">What's free, forever:</Text>
          <Text className="text-xs text-brand-700">✓ Unlimited route planning</Text>
          <Text className="text-xs text-brand-700">✓ GPX export — no paywall</Text>
          <Text className="text-xs text-brand-700">✓ Device sync (Garmin, Wahoo)</Text>
          <Text className="text-xs text-brand-700">✓ Full sensor support (HR, power)</Text>
        </View>

        <View className="items-center mt-6">
          <Text className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-brand-600 font-semibold">
              Sign in
            </Link>
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
