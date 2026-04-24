import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteCard } from '../../components/Route/RouteCard';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { useAuthStore } from '../../stores/authStore';
import { useRouteStore } from '../../stores/routeStore';
import { formatDistance } from '../../lib/routing';

const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  explorer: 'Explorer',
  lifetime: 'Lifetime',
};

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-gray-100 text-gray-600',
  explorer: 'bg-brand-100 text-brand-700',
  lifetime: 'bg-yellow-100 text-yellow-700',
};

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();
  const { myRoutes, isLoadingMine, myError, fetchMyRoutes, deleteRoute, exportRouteGpx } = useRouteStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchMyRoutes();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchMyRoutes();
    setIsRefreshing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You will be returned to the login screen.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const handleDelete = (routeId: string, title: string) => {
    Alert.alert(`Delete "${title}"?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteRoute(routeId);
          } catch {
            Alert.alert('Error', 'Could not delete route');
          }
        },
      },
    ]);
  };

  const handleBulkExport = async () => {
    if (myRoutes.length === 0) {
      Alert.alert('No routes', 'Create some routes first!');
      return;
    }
    // On device, export all as individual shares; in production, call bulk-export edge function
    const { shareGpxFile } = await import('../../lib/gpx');
    for (const route of myRoutes) {
      const gpx = exportRouteGpx(route);
      await shareGpxFile(route.title, gpx).catch(() => null);
    }
  };

  if (!profile) return <Loading message="Loading profile..." fullScreen />;

  const planStyle = PLAN_COLORS[profile.plan] ?? PLAN_COLORS.free;
  const totalDistance = myRoutes.reduce((acc, r) => acc + r.distance_m, 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <FlatList
        data={myRoutes}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            {/* Profile card */}
            <View className="bg-white px-4 pt-6 pb-5 mb-3">
              <View className="flex-row items-center gap-x-4 mb-4">
                <View className="w-16 h-16 rounded-full bg-brand-200 items-center justify-center">
                  <Text className="text-2xl font-bold text-brand-700">
                    {profile.username.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-xl font-bold text-gray-900">@{profile.username}</Text>
                  <View className={`self-start rounded-full px-2.5 py-0.5 mt-1 ${planStyle.split(' ')[0]}`}>
                    <Text className={`text-xs font-semibold ${planStyle.split(' ')[1]}`}>
                      {PLAN_LABELS[profile.plan]} Plan
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats */}
              <View className="flex-row bg-gray-50 rounded-xl p-3 gap-x-4 mb-4">
                <MiniStat label="Routes" value={String(myRoutes.length)} />
                <View className="w-px bg-gray-200 self-stretch" />
                <MiniStat label="Total distance" value={formatDistance(totalDistance)} />
              </View>

              <View className="gap-y-2">
                <Button
                  label="📦 Bulk Export GPX"
                  onPress={handleBulkExport}
                  variant="secondary"
                  fullWidth
                />
                {profile.plan === 'free' && (
                  <Button
                    label="✨ Upgrade to Explorer — $1.99/mo"
                    onPress={() => Alert.alert('Coming soon', 'Payments launching soon!')}
                    variant="ghost"
                    fullWidth
                  />
                )}
              </View>
            </View>

            <View className="px-4 mb-2">
              <Text className="text-lg font-bold text-gray-900">My Routes</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <RouteCard route={item} onPress={() => router.push(`/route/${item.id}`)} />
            <View className="flex-row gap-x-2 -mt-1 mb-1 px-1">
              <Button
                label="Export GPX"
                onPress={async () => {
                  const gpx = exportRouteGpx(item);
                  const { shareGpxFile } = await import('../../lib/gpx');
                  shareGpxFile(item.title, gpx).catch((e) =>
                    Alert.alert('Export failed', e.message)
                  );
                }}
                variant="secondary"
                size="sm"
              />
              <Button
                label="Delete"
                onPress={() => handleDelete(item.id, item.title)}
                variant="danger"
                size="sm"
              />
            </View>
          </View>
        )}
        ListFooterComponent={
          <View className="px-4 pb-8 mt-4">
            <Button label="Sign out" onPress={handleSignOut} variant="ghost" fullWidth />
          </View>
        }
        ListEmptyComponent={
          !isLoadingMine ? (
            <View className="items-center py-12 gap-y-3 px-4">
              <Text className="text-4xl">🗺️</Text>
              <Text className="text-base font-semibold text-gray-600">No routes yet</Text>
              <Text className="text-sm text-gray-400 text-center">
                Head to Plan Route to create your first route.
              </Text>
              <Button label="Plan a Route" onPress={() => router.push('/(tabs)/route')} />
            </View>
          ) : (
            <Loading message="Loading your routes..." />
          )
        }
        contentContainerClassName="pb-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor="#16a34a" />
        }
      />

      {myError && <ErrorMessage message={myError} onRetry={fetchMyRoutes} />}
    </SafeAreaView>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-base font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}
