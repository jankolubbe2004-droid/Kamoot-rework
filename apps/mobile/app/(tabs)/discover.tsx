import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoamMap, type RoamMapRef } from '../../components/Map/RoamMap';
import { RouteMap } from '../../components/Map/RouteMap';
import { RouteCard } from '../../components/Route/RouteCard';
import { BottomSheet } from '../../components/ui/BottomSheet';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { useRouteStore } from '../../stores/routeStore';
import type { Route, SportType } from '../../types';

const SPORT_FILTERS: { label: string; value: SportType | null }[] = [
  { label: 'All',      value: null },
  { label: '🥾',       value: 'hiking' },
  { label: '🚴',       value: 'cycling' },
  { label: '🏃',       value: 'trail_running' },
  { label: '🚵',       value: 'mountain_biking' },
  { label: '🚶',       value: 'walking' },
];

type SheetSnap = 'peek' | 'half' | 'full';

export default function DiscoverScreen() {
  const { publicRoutes, isLoadingPublic, publicError, fetchPublicRoutes } = useRouteStore();
  const mapRef = useRef<RoamMapRef>(null);

  const [query, setQuery]             = useState('');
  const [sportFilter, setSportFilter] = useState<SportType | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [snap, setSnap]               = useState<SheetSnap>('half');
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);

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

  const handleRoutePress = (route: Route) => {
    router.push(`/route/${route.id}`);
  };

  const handleRouteSelect = (route: Route) => {
    setSelectedRoute(route);
    if (route.waypoints[0]) {
      mapRef.current?.flyTo(route.waypoints[0].lng, route.waypoints[0].lat, 13);
    }
    setSnap('peek');
  };

  const firstRoute = publicRoutes[0];
  const mapLat = firstRoute?.waypoints[0]?.lat ?? 51.505;
  const mapLng = firstRoute?.waypoints[0]?.lng ?? -0.09;

  if (isLoadingPublic && publicRoutes.length === 0) {
    return <Loading message="Loading routes..." fullScreen />;
  }

  return (
    <View className="flex-1">
      {/* Full-screen map */}
      <RoamMap
        ref={mapRef}
        initialLat={mapLat}
        initialLng={mapLng}
        initialZoom={10}
        onPress={() => {
          setSelectedRoute(null);
          setSnap('half');
        }}
      />

      {/* Route highlight overlay when a route is tapped in the list */}
      {selectedRoute && selectedRoute.waypoints.length >= 2 && (
        <View style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <RouteMap
            waypoints={selectedRoute.waypoints}
            sportType={selectedRoute.sport_type}
            initialLat={selectedRoute.waypoints[0].lat}
            initialLng={selectedRoute.waypoints[0].lng}
          />
        </View>
      )}

      <SafeAreaView
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
        edges={['top']}
        pointerEvents="box-none"
      >
        {/* Search bar */}
        <View className="mx-4 mt-3 bg-white rounded-2xl shadow-md px-3 py-2.5 flex-row items-center gap-x-2">
          <Text>🔍</Text>
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

        {/* Sport filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, gap: 6 }}
          pointerEvents="box-none"
        >
          {SPORT_FILTERS.map((f) => (
            <Pressable
              key={f.label}
              onPress={() => setSportFilter(f.value)}
              className={[
                'px-3 py-1.5 rounded-full border shadow-sm',
                sportFilter === f.value
                  ? 'bg-brand-600 border-brand-600'
                  : 'bg-white border-gray-200',
              ].join(' ')}
            >
              <Text
                className={`text-sm font-medium ${
                  sportFilter === f.value ? 'text-white' : 'text-gray-700'
                }`}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>

      {/* Bottom sheet with route list */}
      <BottomSheet snap={snap} onSnapChange={(s) => setSnap(s as SheetSnap)}>
        <View className="px-4 pb-2">
          <Text className="text-lg font-bold text-gray-900 mb-1">
            {publicRoutes.length > 0
              ? `${publicRoutes.length} route${publicRoutes.length !== 1 ? 's' : ''} found`
              : 'Discover Routes'}
          </Text>
        </View>

        {publicError ? (
          <View className="px-4">
            <ErrorMessage message={publicError} onRetry={handleRefresh} />
          </View>
        ) : publicRoutes.length === 0 ? (
          <View className="items-center py-16 gap-y-3 px-4">
            <Text className="text-5xl">🗺️</Text>
            <Text className="text-base font-semibold text-gray-600">No routes found</Text>
            <Text className="text-sm text-gray-400 text-center">
              Be the first to share a route!
            </Text>
          </View>
        ) : (
          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor="#16a34a"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <View className="px-4 gap-y-2 pb-8">
              {publicRoutes.map((route) => (
                <Pressable
                  key={route.id}
                  onPress={() => handleRouteSelect(route)}
                  onLongPress={() => handleRoutePress(route)}
                >
                  <RouteCard
                    route={route}
                    onPress={() => handleRoutePress(route)}
                  />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </BottomSheet>
    </View>
  );
}
