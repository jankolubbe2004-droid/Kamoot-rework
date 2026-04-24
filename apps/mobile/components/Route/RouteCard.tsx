import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';
import type { Route } from '../../types';
import { formatDistance, formatElevation } from '../../lib/routing';
import { DifficultyBadge, SportBadge } from '../ui/Badge';

interface RouteCardProps {
  route: Route;
  onPress: () => void;
}

export function RouteCard({ route, onPress }: RouteCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-white rounded-2xl shadow-sm overflow-hidden active:opacity-90 mb-3"
    >
      {route.gpx_url ? (
        <View className="h-32 bg-brand-50 items-center justify-center">
          <Text className="text-4xl">🗺️</Text>
        </View>
      ) : (
        <View className="h-32 bg-gradient-to-br from-brand-100 to-brand-200 items-center justify-center">
          <Text className="text-5xl">🥾</Text>
        </View>
      )}

      <View className="p-4 gap-y-2">
        <Text className="text-base font-semibold text-gray-900 leading-tight" numberOfLines={2}>
          {route.title}
        </Text>

        {route.description && (
          <Text className="text-sm text-gray-500 leading-relaxed" numberOfLines={2}>
            {route.description}
          </Text>
        )}

        <View className="flex-row flex-wrap gap-1.5">
          <SportBadge sport={route.sport_type} />
          <DifficultyBadge difficulty={route.difficulty} />
        </View>

        <View className="flex-row gap-x-4 mt-1">
          <StatChip icon="📍" label={formatDistance(route.distance_m)} />
          <StatChip icon="⛰️" label={formatElevation(route.elevation_gain_m)} />
          {route.waypoints.length > 0 && (
            <StatChip icon="🚩" label={`${route.waypoints.length} pts`} />
          )}
        </View>

        {route.profile && (
          <View className="flex-row items-center gap-x-2 pt-1 border-t border-gray-100">
            {route.profile.avatar_url ? (
              <Image
                source={{ uri: route.profile.avatar_url }}
                className="w-5 h-5 rounded-full bg-gray-200"
              />
            ) : (
              <View className="w-5 h-5 rounded-full bg-brand-200 items-center justify-center">
                <Text className="text-xs text-brand-700">
                  {route.profile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <Text className="text-xs text-gray-500">{route.profile.username}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function StatChip({ icon, label }: { icon: string; label: string }) {
  return (
    <View className="flex-row items-center gap-x-1">
      <Text className="text-xs">{icon}</Text>
      <Text className="text-xs text-gray-600 font-medium">{label}</Text>
    </View>
  );
}
