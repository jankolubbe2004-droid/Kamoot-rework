import { router } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoamMap, type RoamMapRef } from '../../components/Map/RoamMap';
import { WaypointMarkers } from '../../components/Map/WaypointMarker';
import { WaypointList } from '../../components/Route/WaypointList';
import { Button } from '../../components/ui/Button';
import { useRouteStore } from '../../stores/routeStore';
import type { Difficulty, SportType } from '../../types';
import { useRef } from 'react';

const SPORT_OPTIONS: { label: string; value: SportType }[] = [
  { label: '🥾 Hiking', value: 'hiking' },
  { label: '🚴 Cycling', value: 'cycling' },
  { label: '🏃 Running', value: 'trail_running' },
  { label: '🚵 MTB', value: 'mountain_biking' },
  { label: '🚶 Walking', value: 'walking' },
];

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Easy', value: 'easy' },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Hard', value: 'hard' },
  { label: 'Expert', value: 'expert' },
];

type PanelTab = 'map' | 'details';

export default function RouteScreen() {
  const mapRef = useRef<RoamMapRef>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>('map');
  const [isPublic, setIsPublic] = useState(false);

  const {
    draftTitle,
    draftDescription,
    draftSportType,
    draftDifficulty,
    draftWaypoints,
    isSaving,
    saveError,
    setDraftTitle,
    setDraftDescription,
    setDraftSportType,
    setDraftDifficulty,
    addWaypoint,
    removeWaypoint,
    saveRoute,
    resetDraft,
    exportRouteGpx,
  } = useRouteStore();

  const handleMapLongPress = (lat: number, lng: number) => {
    addWaypoint({ lat, lng });
  };

  const handleSave = async () => {
    if (!draftTitle.trim()) {
      Alert.alert('Title required', 'Please enter a route title before saving.');
      setActiveTab('details');
      return;
    }
    if (draftWaypoints.length < 2) {
      Alert.alert('Waypoints needed', 'Add at least 2 waypoints by long-pressing the map.');
      setActiveTab('map');
      return;
    }
    try {
      const saved = await saveRoute(isPublic);
      Alert.alert('Route saved!', isPublic ? 'Your route is now public.' : 'Route saved privately.', [
        {
          text: 'View Route',
          onPress: () => router.push(`/route/${saved.id}`),
        },
        { text: 'New Route', onPress: resetDraft },
      ]);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleExportGpx = () => {
    if (draftWaypoints.length < 2) {
      Alert.alert('Nothing to export', 'Add at least 2 waypoints first.');
      return;
    }
    const fakeRoute = {
      id: 'draft',
      user_id: '',
      title: draftTitle || 'My Route',
      description: draftDescription || null,
      sport_type: draftSportType,
      difficulty: draftDifficulty,
      distance_m: 0,
      elevation_gain_m: 0,
      gpx_url: null,
      is_public: false,
      waypoints: draftWaypoints,
      created_at: new Date().toISOString(),
    };
    const gpx = exportRouteGpx(fakeRoute);
    import('../../lib/gpx').then(({ shareGpxFile }) => {
      shareGpxFile(draftTitle || 'route', gpx).catch((e) =>
        Alert.alert('Export failed', e.message)
      );
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1">
        {/* Header */}
        <View className="px-4 pt-4 pb-3 flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-gray-900">Plan Route</Text>
          <View className="flex-row gap-x-2">
            <Button label="Export GPX" onPress={handleExportGpx} variant="secondary" size="sm" />
            <Button
              label={isSaving ? 'Saving…' : 'Save'}
              onPress={handleSave}
              isLoading={isSaving}
              size="sm"
            />
          </View>
        </View>

        {/* Tab switcher */}
        <View className="flex-row px-4 mb-3 gap-x-2">
          <TabButton label="🗺️ Map" isActive={activeTab === 'map'} onPress={() => setActiveTab('map')} />
          <TabButton label="✏️ Details" isActive={activeTab === 'details'} onPress={() => setActiveTab('details')} />
        </View>

        {activeTab === 'map' ? (
          <View className="flex-1">
            <RoamMap ref={mapRef} onLongPress={handleMapLongPress}>
              <WaypointMarkers waypoints={draftWaypoints} />
            </RoamMap>

            {/* Floating waypoint count */}
            <View className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-3">
              <Text className="text-xs text-gray-500 mb-1">
                {draftWaypoints.length === 0
                  ? 'Long-press the map to add waypoints'
                  : `${draftWaypoints.length} waypoint${draftWaypoints.length !== 1 ? 's' : ''} added`}
              </Text>
              <WaypointList
                waypoints={draftWaypoints}
                onRemove={removeWaypoint}
                onPress={(i) => {
                  const wp = draftWaypoints[i];
                  mapRef.current?.flyTo(wp.lng, wp.lat);
                }}
              />
            </View>
          </View>
        ) : (
          <KeyboardAvoidingView
            className="flex-1"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView className="flex-1 px-4" keyboardShouldPersistTaps="handled">
              <View className="gap-y-5 pb-8">
                {saveError && (
                  <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <Text className="text-sm text-red-700">{saveError}</Text>
                  </View>
                )}

                <View className="gap-y-1">
                  <Text className="text-sm font-medium text-gray-700">Title</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                    placeholder="My awesome route"
                    placeholderTextColor="#9ca3af"
                    value={draftTitle}
                    onChangeText={setDraftTitle}
                    maxLength={80}
                  />
                </View>

                <View className="gap-y-1">
                  <Text className="text-sm font-medium text-gray-700">Description (optional)</Text>
                  <TextInput
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base text-gray-900 bg-white"
                    placeholder="Describe the route, highlights, tips..."
                    placeholderTextColor="#9ca3af"
                    value={draftDescription}
                    onChangeText={setDraftDescription}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                </View>

                <SelectorGroup
                  label="Activity type"
                  options={SPORT_OPTIONS}
                  selected={draftSportType}
                  onSelect={(v) => setDraftSportType(v as SportType)}
                />

                <SelectorGroup
                  label="Difficulty"
                  options={DIFFICULTY_OPTIONS}
                  selected={draftDifficulty}
                  onSelect={(v) => setDraftDifficulty(v as Difficulty)}
                />

                <View className="flex-row items-center justify-between py-3 border-t border-gray-100">
                  <View>
                    <Text className="text-sm font-medium text-gray-800">Share publicly</Text>
                    <Text className="text-xs text-gray-400">Others can discover this route</Text>
                  </View>
                  <View
                    onTouchEnd={() => setIsPublic(!isPublic)}
                    className={[
                      'w-12 h-6 rounded-full',
                      isPublic ? 'bg-brand-600' : 'bg-gray-300',
                    ].join(' ')}
                  >
                    <View
                      className={[
                        'w-5 h-5 bg-white rounded-full shadow mt-0.5 transition-all',
                        isPublic ? 'ml-6' : 'ml-0.5',
                      ].join(' ')}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </View>
    </SafeAreaView>
  );
}

function TabButton({
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
        'flex-1 py-2 rounded-xl items-center',
        isActive ? 'bg-brand-600' : 'bg-gray-100',
      ].join(' ')}
    >
      <Text className={`text-sm font-semibold ${isActive ? 'text-white' : 'text-gray-600'}`}>
        {label}
      </Text>
    </View>
  );
}

function SelectorGroup<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { label: string; value: T }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View className="gap-y-2">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((opt) => (
          <View
            key={opt.value}
            onTouchEnd={() => onSelect(opt.value)}
            className={[
              'px-3 py-2 rounded-xl border',
              selected === opt.value
                ? 'bg-brand-600 border-brand-600'
                : 'bg-white border-gray-200',
            ].join(' ')}
          >
            <Text
              className={`text-sm font-medium ${
                selected === opt.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {opt.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
