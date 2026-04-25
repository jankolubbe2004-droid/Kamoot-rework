import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase, getPublicUrl } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

const SPORT_OPTIONS = [
  { label: '🥾 Hiking',      value: 'hiking' },
  { label: '🚴 Cycling',     value: 'cycling' },
  { label: '🏃 Trail run',   value: 'trail_running' },
  { label: '🚵 MTB',         value: 'mountain_biking' },
  { label: '🚶 Walking',     value: 'walking' },
] as const;

export default function ProfileSetupScreen() {
  const { user, profile, updateProfile, completeProfileSetup, isLoading } = useAuthStore();

  const [username, setUsername]         = useState(profile?.username ?? '');
  const [usernameError, setUsernameError] = useState('');
  const [avatarUri, setAvatarUri]       = useState<string | null>(null);
  const [isUploading, setIsUploading]   = useState(false);
  const [favSport, setFavSport]         = useState<string>('hiking');

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarUri || !user) return null;
    setIsUploading(true);
    try {
      const ext  = avatarUri.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const blob = await (await fetch(avatarUri)).blob();

      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

      if (error) throw error;
      return getPublicUrl('avatars', path);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const validate = () => {
    if (!username.trim())              { setUsernameError('Username is required'); return false; }
    if (username.length < 3)           { setUsernameError('At least 3 characters'); return false; }
    if (!/^[a-z0-9_]+$/i.test(username)) { setUsernameError('Letters, numbers and _ only'); return false; }
    setUsernameError('');
    return true;
  };

  const handleContinue = async () => {
    if (!validate()) return;
    try {
      const avatarUrl = await uploadAvatar();
      await updateProfile({
        username: username.trim().toLowerCase(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      });
      completeProfileSetup();
      router.replace('/(tabs)/discover');
    } catch { /* error shown by updateProfile */ }
  };

  const handleSkip = () => {
    completeProfileSetup();
    router.replace('/(tabs)/discover');
  };

  const initials = username.slice(0, 2).toUpperCase() || '?';
  const busy     = isLoading || isUploading;

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="mb-8">
            <Text className="text-3xl font-bold text-white">Set up your profile</Text>
            <Text className="text-gray-400 mt-1.5">You can always change this later.</Text>
          </View>

          {/* Avatar picker */}
          <View className="items-center mb-8">
            <Pressable onPress={pickAvatar} className="relative">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  className="w-24 h-24 rounded-full border-2 border-green-500"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-700 items-center justify-center">
                  <Text className="text-3xl font-bold text-green-400">{initials}</Text>
                </View>
              )}
              <View className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-green-500 border-2 border-gray-950 items-center justify-center">
                <Text className="text-gray-950 text-xs font-bold">+</Text>
              </View>
            </Pressable>
            <Pressable onPress={pickAvatar} className="mt-3">
              <Text className="text-green-400 text-sm font-medium">
                {avatarUri ? 'Change photo' : 'Add profile photo'}
              </Text>
            </Pressable>
          </View>

          {/* Username */}
          <View className="gap-y-1.5 mb-6">
            <Text className="text-sm font-medium text-gray-300">Username</Text>
            <TextInput
              className={[
                'bg-gray-900 border rounded-xl px-4 py-3 text-base text-white',
                usernameError ? 'border-red-700' : 'border-gray-700',
              ].join(' ')}
              value={username}
              onChangeText={setUsername}
              placeholder="e.g. trailrunner_uk"
              placeholderTextColor="#4b5563"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={30}
            />
            {usernameError ? (
              <Text className="text-xs text-red-400">{usernameError}</Text>
            ) : (
              <Text className="text-xs text-gray-600">
                roamfree.app/@{username || '…'}
              </Text>
            )}
          </View>

          {/* Favourite sport */}
          <View className="gap-y-3 mb-10">
            <Text className="text-sm font-medium text-gray-300">Primary activity</Text>
            <View className="flex-row flex-wrap gap-2">
              {SPORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setFavSport(opt.value)}
                  className={[
                    'px-3 py-2 rounded-xl border',
                    favSport === opt.value
                      ? 'bg-green-500/10 border-green-500'
                      : 'bg-gray-900 border-gray-700',
                  ].join(' ')}
                >
                  <Text
                    className={[
                      'text-sm font-medium',
                      favSport === opt.value ? 'text-green-400' : 'text-gray-400',
                    ].join(' ')}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Actions */}
          <View className="gap-y-3">
            <Pressable
              onPress={handleContinue}
              disabled={busy}
              className="bg-green-500 active:bg-green-600 rounded-xl py-3.5 items-center disabled:opacity-50"
            >
              <Text className="text-gray-950 font-bold text-base">
                {busy ? 'Saving…' : "Let's go! 🏔️"}
              </Text>
            </Pressable>

            <Pressable onPress={handleSkip} className="items-center py-2">
              <Text className="text-gray-500 text-sm">Skip for now</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
