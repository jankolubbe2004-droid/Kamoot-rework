import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteCard } from '../../components/Route/RouteCard';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { useRouteStore } from '../../stores/routeStore';
import type { SportType } from '../../types';

const SPORT_FILTERS: { label: string; value: SportType | null }[] = [
  { label: 'All', value: null },
  { label: '🥾 Hiking', value: 'hiking' },
  { label: '🚴 Cycling', value: 'cycling' },
  { label: '🏃 Running', value: 'trail_running' },
  { label: '🚵 MTB', value: 'mountain_biking' },
  { label: '🚶 Walking', value: 'walking' },
];

export default function DiscoverScreen() {
  const { publicRoutes, isLoadingPublic, publicError, fetchPublicRoutes } = useRouteStore();
  const [query, setQuery] = useState('');
  const [sportFilter, setSportFilter] = useState<SportType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchPublicRoutes({ sport_type: sportFilter ?? undefined, query: query || undefined });
  }, [sportFilter]);

  const handleSearch = () => {
    fetchPublicRoutes({ sport_type: sportFilter ?? undefined, query: query || undefined });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPublicRoutes({ sport_type: sportFilter ?? undefined, query: query || undefined });
    setIsRefreshing(false);
  };

  if (isLoadingPublic && publicRoutes.length === 0) {
    return <Loading message="Loading routes..." fullScreen />;
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <View className="bg-white px-4 pt-4 pb-3 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-3">Discover</Text>

        <View className="flex-row items-center bg-gray-100 rounded-xl px-3 py-2.5 mb-3">
          <Text className="mr-2">🔍</Text>
          <TextInput
            className="flex-1 text-sm text-gray-800"
            placeholder="Search routes..."
            placeholderTextColor="#9ca3af"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>

        <View className="flex-row gap-x-2">
          {SPORT_FILTERS.map((f) => (
            <FilterChip
              key={f.label}
              label={f.label}
              isActive={sportFilter === f.value}
              onPress={() => setSportFilter(f.value)}
            />
          ))}
        </View>
      </View>

      {publicError ? (
        <ErrorMessage message={publicError} onRetry={handleRefresh} />
      ) : (
        <FlatList
          data={publicRoutes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RouteCard
              route={item}
              onPress={() => router.push(`/route/${item.id}`)}
            />
          )}
          contentContainerClassName="px-4 pt-4 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
          }
          ListEmptyComponent={
            <View className="items-center py-16 gap-y-3">
              <Text className="text-5xl">🗺️</Text>
              <Text className="text-base font-semibold text-gray-600">No routes found</Text>
              <Text className="text-sm text-gray-400 text-center">
                Be the first to share a route!
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <View
      onTouchEnd={onPress}
      className={[
        'px-3 py-1.5 rounded-full border',
        isActive
          ? 'bg-brand-600 border-brand-600'
          : 'bg-white border-gray-200',
      ].join(' ')}
    >
      <Text className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-600'}`}>
        {label}
      </Text>
    </View>
  );
}
