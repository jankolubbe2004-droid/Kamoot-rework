import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteMap } from '../../components/Map/RouteMap';
import { ElevationChart } from '../../components/Route/ElevationChart';
import { CommunityPhotos } from '../../components/Route/CommunityPhotos';
import { StarRating, RatingBreakdown } from '../../components/Route/StarRating';
import { RouteStats } from '../../components/Route/RouteStats';
import { Button } from '../../components/ui/Button';
import { DifficultyBadge, SportBadge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { supabase, getPublicUrl } from '../../lib/supabase';
import { shareGpxFile } from '../../lib/gpx';
import { generateElevationProfile } from '../../lib/routing';
import { useRouteStore } from '../../stores/routeStore';
import { useAuthStore } from '../../stores/authStore';
import type { Route, RoutePhoto, RouteRating } from '../../types';

export default function RouteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [route, setRoute]     = useState<Route | null>(null);
  const [photos, setPhotos]   = useState<RoutePhoto[]>([]);
  const [ratings, setRatings] = useState<RouteRating[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRating, setIsRating] = useState(false);

  const { user } = useAuthStore();
  const { exportRouteGpx, deleteRoute } = useRouteStore();

  useEffect(() => {
    if (id) loadAll(id);
  }, [id]);

  const loadAll = async (routeId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [routeRes, photosRes, ratingsRes] = await Promise.all([
        supabase
          .from('routes')
          .select('*, profile:profiles(username, avatar_url)')
          .eq('id', routeId)
          .single(),
        supabase
          .from('route_photos')
          .select('*')
          .eq('route_id', routeId)
          .order('created_at', { ascending: false }),
        supabase
          .from('route_ratings')
          .select('*')
          .eq('route_id', routeId),
      ]);

      if (routeRes.error) throw routeRes.error;
      setRoute(routeRes.data as Route);
      setPhotos((photosRes.data ?? []) as RoutePhoto[]);
      setRatings((ratingsRes.data ?? []) as RouteRating[]);

      const mine = (ratingsRes.data ?? []).find((r) => r.user_id === user?.id);
      if (mine) setMyRating(mine.rating);
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

  const handleAddPhoto = async () => {
    if (!route || !user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setIsUploading(true);
    try {
      const uri = result.assets[0].uri;
      const ext = uri.split('.').pop() ?? 'jpg';
      const path = `${route.id}/${user.id}_${Date.now()}.${ext}`;
      const blob = await (await fetch(uri)).blob();

      const { error: upErr } = await supabase.storage
        .from('route-photos')
        .upload(path, blob, { upsert: false, contentType: `image/${ext}` });
      if (upErr) throw upErr;

      const { error: dbErr } = await supabase.from('route_photos').insert({
        route_id: route.id,
        user_id: user.id,
        storage_path: path,
        caption: null,
        lat: null,
        lng: null,
      });
      if (dbErr) throw dbErr;

      await loadAll(route.id);
    } catch (err) {
      Alert.alert('Upload failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRate = async (star: number) => {
    if (!route || !user) {
      Alert.alert('Sign in required', 'You need an account to rate routes.');
      return;
    }
    setIsRating(true);
    try {
      await supabase.from('route_ratings').upsert(
        { route_id: route.id, user_id: user.id, rating: star, review: null },
        { onConflict: 'route_id,user_id' }
      );
      setMyRating(star);
      await loadAll(route.id);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Could not save rating');
    } finally {
      setIsRating(false);
    }
  };

  const { avgRating, ratingCount, distribution } = useMemo(() => {
    const count = ratings.length;
    const avg = count > 0 ? ratings.reduce((s, r) => s + r.rating, 0) / count : 0;
    const dist: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => {
      const star = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (star >= 1 && star <= 5) dist[star]++;
    });
    return { avgRating: avg, ratingCount: count, distribution: dist };
  }, [ratings]);

  const elevationPoints = useMemo(() => {
    if (!route) return [];
    return generateElevationProfile(route.waypoints, 8);
  }, [route]);

  if (isLoading) return <Loading message="Loading route..." fullScreen />;
  if (error || !route) return <ErrorMessage message={error ?? 'Route not found'} onRetry={() => id && loadAll(id)} />;

  const isOwner = user?.id === route.user_id;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Map with sport-colored polyline */}
        <View style={{ height: 240 }}>
          {route.waypoints.length >= 2 ? (
            <RouteMap
              waypoints={route.waypoints}
              sportType={route.sport_type}
              initialLat={route.waypoints[0].lat}
              initialLng={route.waypoints[0].lng}
              initialZoom={12}
            />
          ) : (
            <View className="flex-1 items-center justify-center bg-brand-50">
              <Text className="text-5xl">🗺️</Text>
              <Text className="text-sm text-gray-400 mt-2">No waypoints</Text>
            </View>
          )}
        </View>

        <View className="px-4 pt-5 pb-10 gap-y-6">
          {/* Title + badges */}
          <View className="gap-y-2">
            <Text className="text-2xl font-bold text-gray-900 leading-tight">{route.title}</Text>
            <View className="flex-row flex-wrap gap-2 items-center">
              <SportBadge sport={route.sport_type} />
              <DifficultyBadge difficulty={route.difficulty} />
              {route.is_public && (
                <View className="bg-blue-50 rounded-full px-2.5 py-0.5">
                  <Text className="text-xs font-medium text-blue-700">Public</Text>
                </View>
              )}
              {ratingCount > 0 && (
                <StarRating value={avgRating} size={14} count={ratingCount} />
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

          {/* Elevation chart */}
          {elevationPoints.length >= 2 && (
            <View className="gap-y-2">
              <Text className="text-sm font-semibold text-gray-700">Elevation profile</Text>
              <ElevationChart points={elevationPoints} height={90} />
            </View>
          )}

          {/* Description */}
          {route.description && (
            <View className="gap-y-1">
              <Text className="text-sm font-semibold text-gray-700">About this route</Text>
              <Text className="text-sm text-gray-600 leading-relaxed">{route.description}</Text>
            </View>
          )}

          {/* Community photos */}
          <CommunityPhotos
            photos={photos}
            onAdd={user ? handleAddPhoto : undefined}
          />
          {isUploading && (
            <Text className="text-xs text-brand-600 -mt-4">Uploading photo…</Text>
          )}

          {/* Ratings */}
          <View className="gap-y-3">
            <Text className="text-sm font-semibold text-gray-700">Ratings</Text>

            {ratingCount > 0 && (
              <RatingBreakdown
                average={avgRating}
                count={ratingCount}
                distribution={distribution}
              />
            )}

            {user && (
              <View className="gap-y-1 pt-1">
                <Text className="text-xs text-gray-500">
                  {myRating > 0 ? 'Your rating' : 'Rate this route'}
                </Text>
                <StarRating
                  value={myRating}
                  size={28}
                  interactive
                  onChange={isRating ? undefined : handleRate}
                />
              </View>
            )}

            {ratingCount === 0 && !user && (
              <Text className="text-sm text-gray-400">No ratings yet. Sign in to rate.</Text>
            )}
          </View>

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
                    {wp.title ??
                      (i === 0
                        ? 'Start'
                        : i === route.waypoints.length - 1
                        ? 'End'
                        : `Waypoint ${i}`)}
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
