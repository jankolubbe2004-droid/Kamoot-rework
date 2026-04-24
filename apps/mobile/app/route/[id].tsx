import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoamMap } from '../../components/Map/RoamMap';
import { WaypointMarkers } from '../../components/Map/WaypointMarker';
import { RouteStats } from '../../components/Route/RouteStats';
import { Button } from '../../components/ui/Button';
import { DifficultyBadge, SportBadge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { supabase } from '../../lib/supabase';
import { shareGpxFile } from '../../lib/gpx';
import { useRouteStore } from '../../stores/routeStore';
import { useAuthStore } from '../../stores/authStore';
import type { Route } from '../../types';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuthStore();
  const { exportRouteGpx, deleteRoute } = useRouteStore();

  useEffect(() => {
    if (!id) return;
    loadRoute(id);
  }, [id]);

  const loadRoute = async (routeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('routes')
        .select('*, profile:profiles(username, avatar_url)')
        .eq('id', routeId)
        .single();

      if (err) throw err;
      setRoute(data as Route);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Route not found');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!route) return;
    try {
      const gpx = exportRouteGpx(route);
      await shareGpxFile(route.title, gpx);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDelete = () => {
    if (!route) return;
    Alert.alert(`Delete "${route.title}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoute(route.id);
            router.back();
          } catch {
            Alert.alert('Error', 'Could not delete route');
          }
        },
      },
    ]);
  };

  if (isLoading) return <Loading message="Loading route..." fullScreen />;
  if (error || !route) return <ErrorMessage message={error ?? 'Route not found'} onRetry={() => id && loadRoute(id)} />;

  const isOwner = user?.id === route.user_id;
  const firstWaypoint = route.waypoints[0];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Map */}
        <View className="h-64 bg-gray-100">
          {firstWaypoint ? (
            <RoamMap
              initialLat={firstWaypoint.lat}
              initialLng={firstWaypoint.lng}
              initialZoom={12}
            >
              <WaypointMarkers waypoints={route.waypoints} />
            </RoamMap>
          ) : (
            <View className="flex-1 items-center justify-center bg-brand-50">
              <Text className="text-5xl">🗺️</Text>
              <Text className="text-sm text-gray-400 mt-2">No waypoints</Text>
            </View>
          )}
        </View>

        <View className="px-4 pt-5 pb-8 gap-y-5">
          {/* Title and badges */}
          <View className="gap-y-2">
            <Text className="text-2xl font-bold text-gray-900 leading-tight">{route.title}</Text>
            <View className="flex-row flex-wrap gap-2">
              <SportBadge sport={route.sport_type} />
              <DifficultyBadge difficulty={route.difficulty} />
              {route.is_public && (
                <View className="bg-blue-50 rounded-full px-2.5 py-0.5">
                  <Text className="text-xs font-medium text-blue-700">Public</Text>
                </View>
              )}
            </View>
          </View>

          {/* Author */}
          {route.profile && (
            <View className="flex-row items-center gap-x-2">
              <View className="w-8 h-8 rounded-full bg-brand-200 items-center justify-center">
                <Text className="text-sm font-bold text-brand-700">
                  {route.profile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text className="text-sm text-gray-600">by @{route.profile.username}</Text>
            </View>
          )}

          {/* Stats */}
          <RouteStats route={route} />

          {/* Description */}
          {route.description && (
            <View className="gap-y-1">
              <Text className="text-sm font-semibold text-gray-700">About this route</Text>
              <Text className="text-sm text-gray-600 leading-relaxed">{route.description}</Text>
            </View>
          )}

          {/* Waypoints */}
          {route.waypoints.length > 0 && (
            <View className="gap-y-2">
              <Text className="text-sm font-semibold text-gray-700">
                Waypoints ({route.waypoints.length})
              </Text>
              {route.waypoints.map((wp, i) => (
                <View key={i} className="flex-row items-center gap-x-3 py-1">
                  <View
                    className={[
                      'w-3 h-3 rounded-full',
                      i === 0
                        ? 'bg-brand-600'
                        : i === route.waypoints.length - 1
                        ? 'bg-red-500'
                        : 'bg-gray-400',
                    ].join(' ')}
                  />
                  <Text className="text-sm text-gray-700 flex-1">
                    {wp.title ?? (i === 0 ? 'Start' : i === route.waypoints.length - 1 ? 'End' : `Waypoint ${i}`)}
                  </Text>
                  <Text className="text-xs text-gray-400">
                    {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Actions */}
          <View className="gap-y-2 pt-2">
            <Button label="📤 Export GPX" onPress={handleExport} variant="secondary" fullWidth />
            {isOwner && (
              <Button label="🗑️ Delete Route" onPress={handleDelete} variant="danger" fullWidth />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
