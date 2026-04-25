import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RoamMap, type RoamMapRef } from '../../components/Map/RoamMap';
import { WaypointMarkers } from '../../components/Map/WaypointMarker';
import { TrackPolyline } from '../../components/Map/TrackPolyline';
import { WaypointList } from '../../components/Route/WaypointList';
import { useRouteStore } from '../../stores/routeStore';
import { shareGpxFile, generateFIT, shareFitFile } from '../../lib/gpx';
import type { Difficulty, SportType } from '../../types';

const SPORT_OPTIONS: { label: string; value: SportType; color: string }[] = [
  { label: '🥾 Hiking',   value: 'hiking',          color: '#16a34a' },
  { label: '🚴 Cycling',  value: 'cycling',          color: '#0ea5e9' },
  { label: '🏃 Running',  value: 'trail_running',    color: '#f97316' },
  { label: '🚵 MTB',      value: 'mountain_biking',  color: '#92400e' },
  { label: '🚶 Walking',  value: 'walking',          color: '#8b5cf6' },
];

const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Easy',     value: 'easy'     },
  { label: 'Moderate', value: 'moderate' },
  { label: 'Hard',     value: 'hard'     },
  { label: 'Expert',   value: 'expert'   },
];

const SPORT_COLOR: Record<SportType, string> = {
  hiking:          '#16a34a',
  cycling:         '#0ea5e9',
  trail_running:   '#f97316',
  mountain_biking: '#92400e',
  walking:         '#8b5cf6',
};

export default function RouteScreen() {
  const mapRef = useRef<RoamMapRef>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const {
    draftTitle, draftDescription, draftSportType, draftDifficulty,
    draftWaypoints, isSaving, saveError,
    calculatedRoute, isCalculating, calcError,
    setDraftTitle, setDraftDescription, setDraftSportType, setDraftDifficulty,
    addWaypoint, removeWaypoint, updateWaypoint,
    triggerCalculation, saveRoute, resetDraft,
    exportDraftGpx, exportDraftFitPoints,
  } = useRouteStore();

  // Auto-calculate whenever waypoints or sport type change
  useEffect(() => {
    if (draftWaypoints.length >= 2) triggerCalculation();
  }, [draftWaypoints.length, draftSportType]);

  const handleMapTap = (lat: number, lng: number) => {
    addWaypoint({ lat, lng });
  };

  const handleRemoveWaypoint = (index: number) => {
    removeWaypoint(index);
  };

  const handleFlyTo = (index: number) => {
    const wp = draftWaypoints[index];
    if (wp) mapRef.current?.flyTo(wp.lng, wp.lat);
  };

  const handleSportChange = (sport: SportType) => {
    setDraftSportType(sport);
    // triggerCalculation fires via useEffect
  };

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!draftTitle.trim()) {
      Alert.alert('Title required', 'Give your route a name before saving.');
      return;
    }
    if (draftWaypoints.length < 2) {
      Alert.alert('Add waypoints', 'Tap the map to add at least 2 waypoints.');
      return;
    }
    try {
      const saved = await saveRoute(isPublic);
      Alert.alert(
        'Route saved!',
        isPublic ? 'Your route is now public.' : 'Saved as private.',
        [
          { text: 'View route', onPress: () => router.push(`/route/${saved.id}`) },
          { text: 'New route',  onPress: resetDraft },
        ],
      );
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ── Export GPX ───────────────────────────────────────────────────────────────

  const handleExportGpx = async () => {
    if (draftWaypoints.length < 1) {
      Alert.alert('Nothing to export', 'Add at least one waypoint first.');
      return;
    }
    try {
      const gpx = exportDraftGpx();
      await shareGpxFile(draftTitle || 'route', gpx);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ── Sync to Device (FIT) ─────────────────────────────────────────────────────

  const handleSyncToDevice = async () => {
    if (draftWaypoints.length < 2) {
      Alert.alert('Add waypoints', 'You need at least 2 waypoints to export a course.');
      return;
    }
    try {
      const points = exportDraftFitPoints();
      const distM  = calculatedRoute?.distance_m ?? 0;
      const fit    = generateFIT(draftTitle || 'Route', points, draftSportType, distM);
      await shareFitFile(draftTitle || 'route', fit);
    } catch (err) {
      Alert.alert('FIT export failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // ── Derived display values ────────────────────────────────────────────────────

  const distKm  = calculatedRoute ? (calculatedRoute.distance_m / 1000).toFixed(1) : '—';
  const elevM   = calculatedRoute ? Math.round(calculatedRoute.elevation_gain_m) : '—';
  const durMin  = calculatedRoute ? Math.round(calculatedRoute.duration_ms / 60000) : null;
  const durStr  = durMin != null
    ? durMin >= 60
      ? `${Math.floor(durMin / 60)}h ${durMin % 60}min`
      : `${durMin} min`
    : '—';

  const routeColor  = SPORT_COLOR[draftSportType] ?? '#16a34a';
  const hasCalcRoute = !!calculatedRoute && calculatedRoute.points.length >= 2;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* ── Full-screen map ───────────────────────────────────────────────── */}
      <View style={{ flex: 1 }}>
        <RoamMap ref={mapRef} onPress={handleMapTap}>
          {/* GH-calculated polyline replaces the straight connector */}
          {hasCalcRoute && (
            <TrackPolyline
              points={calculatedRoute.points}
              color={routeColor}
              width={4}
            />
          )}

          {/* Waypoint pins; suppress built-in straight polyline when GH result is present */}
          <WaypointMarkers
            waypoints={draftWaypoints}
            showPolyline={!hasCalcRoute}
            onMarkerPress={handleFlyTo}
          />
        </RoamMap>

        {/* Tap-to-add hint */}
        {draftWaypoints.length === 0 && (
          <View
            style={{
              position: 'absolute', top: 60, left: 0, right: 0,
              alignItems: 'center', pointerEvents: 'none',
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20,
                paddingHorizontal: 16, paddingVertical: 8,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 13 }}>Tap the map to add a start point</Text>
            </View>
          </View>
        )}

        {/* Undo/clear floating buttons */}
        {draftWaypoints.length > 0 && (
          <View
            style={{
              position: 'absolute', top: 12, right: 12,
              gap: 8, flexDirection: 'column',
            }}
          >
            <Pressable
              onPress={() => removeWaypoint(draftWaypoints.length - 1)}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6, elevation: 4,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15, shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151' }}>↩ Undo</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert('Clear waypoints?', 'This removes all waypoints.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: resetDraft },
                ]);
              }}
              style={{
                backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 20,
                paddingHorizontal: 12, paddingVertical: 6, elevation: 4,
                shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.15, shadowRadius: 4,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#ef4444' }}>✕ Clear</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* ── Bottom panel ──────────────────────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#fff' }}>
          <View
            style={{
              borderTopWidth: 1, borderTopColor: '#f3f4f6',
              shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06, shadowRadius: 8, elevation: 12,
            }}
          >
            {/* Stats row */}
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8,
                gap: 0,
              }}
            >
              <StatCell label="Distance" value={`${distKm} km`} />
              <Divider />
              <StatCell label="Elevation" value={`↑ ${elevM} m`} />
              <Divider />
              <StatCell label="Est. time" value={durStr} />
              {isCalculating && (
                <ActivityIndicator size="small" color={routeColor} style={{ marginLeft: 8 }} />
              )}
              {calcError && !isCalculating && (
                <Text style={{ fontSize: 10, color: '#f97316', marginLeft: 8, flex: 1 }} numberOfLines={1}>
                  ⚠ Offline — straight lines shown
                </Text>
              )}
            </View>

            {/* Sport type selector */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}
            >
              {SPORT_OPTIONS.map((opt) => {
                const active = draftSportType === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => handleSportChange(opt.value)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      borderRadius: 20, borderWidth: 1.5,
                      borderColor: active ? opt.color : '#e5e7eb',
                      backgroundColor: active ? opt.color + '18' : '#fff',
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: active ? opt.color : '#6b7280' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Title input */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
              <TextInput
                style={{
                  borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                  paddingHorizontal: 12, paddingVertical: 8,
                  fontSize: 14, color: '#111827', backgroundColor: '#f9fafb',
                }}
                placeholder="Route name (tap to edit)"
                placeholderTextColor="#9ca3af"
                value={draftTitle}
                onChangeText={setDraftTitle}
                maxLength={80}
                returnKeyType="done"
              />
            </View>

            {/* Waypoint list */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
              <WaypointList
                waypoints={draftWaypoints}
                onRemove={handleRemoveWaypoint}
                onPress={handleFlyTo}
                onUpdateTitle={(i, t) => updateWaypoint(i, { title: t ?? undefined })}
                maxHeight={140}
              />
            </View>

            {/* Expandable details section */}
            <Pressable
              onPress={() => setShowDetails((v) => !v)}
              style={{ paddingHorizontal: 16, paddingBottom: 4 }}
            >
              <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: '500' }}>
                {showDetails ? '▲ Hide details' : '▼ Description, difficulty, visibility'}
              </Text>
            </Pressable>

            {showDetails && (
              <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 8 }}>
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
                    paddingHorizontal: 12, paddingVertical: 8,
                    fontSize: 13, color: '#374151', backgroundColor: '#f9fafb',
                    minHeight: 60, textAlignVertical: 'top',
                  }}
                  placeholder="Description (optional)"
                  placeholderTextColor="#9ca3af"
                  value={draftDescription}
                  onChangeText={setDraftDescription}
                  multiline
                  maxLength={500}
                />

                {/* Difficulty selector */}
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {DIFFICULTY_OPTIONS.map((opt) => {
                    const active = draftDifficulty === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setDraftDifficulty(opt.value)}
                        style={{
                          paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16,
                          borderWidth: 1,
                          borderColor: active ? '#16a34a' : '#e5e7eb',
                          backgroundColor: active ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '500', color: active ? '#16a34a' : '#6b7280' }}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Public toggle */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '500', color: '#374151' }}>Share publicly</Text>
                    <Text style={{ fontSize: 11, color: '#9ca3af' }}>Others can discover this route</Text>
                  </View>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ false: '#d1d5db', true: '#16a34a' }}
                    thumbColor="#fff"
                  />
                </View>

                {saveError && (
                  <Text style={{ fontSize: 12, color: '#ef4444' }}>{saveError}</Text>
                )}
              </View>
            )}

            {/* Action buttons */}
            <View
              style={{
                flexDirection: 'row', paddingHorizontal: 12,
                paddingTop: 6, paddingBottom: 10, gap: 8,
              }}
            >
              <ActionButton
                label={isSaving ? 'Saving…' : '💾 Save Route'}
                onPress={handleSave}
                disabled={isSaving}
                primary
              />
              <ActionButton label="📤 GPX" onPress={handleExportGpx} />
              <ActionButton label="⌚ Sync" onPress={handleSyncToDevice} />
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Local sub-components ──────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>{value}</Text>
      <Text style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function Divider() {
  return <View style={{ width: 1, height: 28, backgroundColor: '#f3f4f6' }} />;
}

function ActionButton({
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: primary ? 2 : 1,
        paddingVertical: 11,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: primary
          ? disabled ? '#d1fae5' : '#16a34a'
          : '#f3f4f6',
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text
        style={{
          fontSize: 13,
          fontWeight: '700',
          color: primary ? '#fff' : '#374151',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
