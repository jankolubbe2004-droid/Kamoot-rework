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

type ScreenState = 'form' | 'sent';

export default function ForgotPasswordScreen() {
  const [email, setEmail]           = useState('');
  const [emailError, setEmailError] = useState('');
  const [state, setState]           = useState<ScreenState>('form');

  const { sendPasswordReset, isLoading, error, clearError } = useAuthStore();

  const validate = () => {
    if (!email.trim()) { setEmailError('Email is required'); return false; }
    if (!/\S+@\S+\.\S+/.test(email)) { setEmailError('Enter a valid email'); return false; }
    setEmailError('');
    return true;
  };

  const handleSubmit = async () => {
    clearError();
    if (!validate()) return;
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      setState('sent');
    } catch { /* error shown from store */ }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Back button */}
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          className="mx-4 mt-2 self-start p-2"
        >
          <Text className="text-green-400 text-base">← Back</Text>
        </Pressable>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          {state === 'sent' ? (
            <SentState email={email} onBack={() => router.replace('/auth/login')} />
          ) : (
            <FormState
              email={email}
              emailError={emailError}
              storeError={error}
              isLoading={isLoading}
              onEmailChange={setEmail}
              onSubmit={handleSubmit}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Form state ────────────────────────────────────────────────────────────────

function FormState({
  email,
  emailError,
  storeError,
  isLoading,
  onEmailChange,
  onSubmit,
}: {
  email: string;
  emailError: string;
  storeError: string | null;
  isLoading: boolean;
  onEmailChange: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <View className="gap-y-6">
      <View className="items-center">
        <View className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/30 items-center justify-center mb-5">
          <Text className="text-3xl">🔑</Text>
        </View>
        <Text className="text-2xl font-bold text-white">Reset password</Text>
        <Text className="text-gray-400 text-sm text-center mt-2 leading-relaxed">
          Enter your email and we'll send you a{'\n'}link to reset your password.
        </Text>
      </View>

      {storeError && (
        <View className="bg-red-950 border border-red-800 rounded-xl px-4 py-3">
          <Text className="text-sm text-red-400">{storeError}</Text>
        </View>
      )}

      <Input
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        error={emailError}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        className="bg-gray-900 border-gray-700 text-white"
      />

      <Pressable
        onPress={onSubmit}
        disabled={isLoading}
        className="bg-green-500 active:bg-green-600 rounded-xl py-3.5 items-center disabled:opacity-50"
      >
        <Text className="text-gray-950 font-bold text-base">
          {isLoading ? 'Sending…' : 'Send reset link'}
        </Text>
      </Pressable>

      <View className="items-center">
        <Text className="text-gray-400 text-sm">
          Remember your password?{' '}
          <Link href="/auth/login">
            <Text className="text-green-400 font-semibold">Sign in</Text>
          </Link>
        </Text>
      </View>
    </View>
  );
}

// ─── Sent state ────────────────────────────────────────────────────────────────

function SentState({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <View className="gap-y-6 items-center">
      <View className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 items-center justify-center">
        <Text className="text-4xl">📬</Text>
      </View>

      <View className="items-center gap-y-2">
        <Text className="text-2xl font-bold text-white">Check your email</Text>
        <Text className="text-gray-400 text-sm text-center leading-relaxed">
          We sent a password reset link to{'\n'}
          <Text className="text-white font-medium">{email}</Text>
        </Text>
        <Text className="text-gray-500 text-xs text-center mt-2">
          Didn't receive it? Check your spam folder{'\n'}or try again in a few minutes.
        </Text>
      </View>

      <Pressable
        onPress={onBack}
        className="bg-green-500 active:bg-green-600 rounded-xl py-3.5 px-8 items-center"
      >
        <Text className="text-gray-950 font-bold text-base">Back to sign in</Text>
      </Pressable>
    </View>
  );
}
