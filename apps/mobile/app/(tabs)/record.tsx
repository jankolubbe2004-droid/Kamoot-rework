import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChartSvg, type ChartPoint } from '../../components/Activity/ChartSvg';
import { SensorStatus } from '../../components/Activity/SensorStatus';
import { RoamMap, type RoamMapRef } from '../../components/Map/RoamMap';
import { TrackPolyline } from '../../components/Map/TrackPolyline';
import { useGPS } from '../../hooks/useGPS';
import { useSensors } from '../../hooks/useSensors';
import { buildGpxFromTrack, shareGpxFile } from '../../lib/gpx';
import { useRecordingStore } from '../../stores/recordingStore';
import type { GpxTrackPoint, SportType } from '../../types';

const SCREEN_W = Dimensions.get('window').width;

const SPORTS: { type: SportType; label: string; color: string }[] = [
  { type: 'hiking',         label: 'Hiking',   color: '#16a34a' },
  { type: 'trail_running',  label: 'Running',  color: '#dc2626' },
  { type: 'cycling',        label: 'Cycling',  color: '#2563eb' },
  { type: 'mountain_biking',label: 'MTB',      color: '#7c3aed' },
  { type: 'walking',        label: 'Walking',  color: '#0891b2' },
];

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

function formatPace(elapsedMs: number, distanceM: number): string {
  if (distanceM < 50) return '--';
  const secPerKm = (elapsedMs / 1000) / (distanceM / 1000);
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}

// ─── Pre-activity screen ──────────────────────────────────────────────────────

interface PreScreenProps {
  sportType: SportType;
  onSetSport: (t: SportType) => void;
  sensors: ReturnType<typeof useSensors>;
  onStart: () => void;
}

function PreScreen({ sportType, onSetSport, sensors, onStart }: PreScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, padding: 20, gap: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-gray-900">New Activity</Text>

        {/* Sport selector */}
        <View>
          <Text className="text-sm font-semibold text-gray-600 mb-2">Activity type</Text>
          <View className="flex-row flex-wrap gap-2">
            {SPORTS.map((s) => {
              const active = sportType === s.type;
              return (
                <Pressable
                  key={s.type}
                  onPress={() => onSetSport(s.type)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    backgroundColor: active ? s.color : '#f3f4f6',
                  }}
                >
                  <Text style={{ color: active ? '#fff' : '#374151', fontWeight: '600', fontSize: 13 }}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Sensors */}
        <SensorStatus
          connectedSensors={sensors.connectedSensors}
          sensorValues={sensors.sensorValues}
          isScanning={sensors.isScanning}
          onScanPress={sensors.scan}
          onDisconnect={sensors.disconnect}
        />

        {/* Start button */}
        <View style={{ marginTop: 'auto' as any, paddingTop: 16 }}>
          <Pressable
            onPress={onStart}
            style={{
              backgroundColor: '#16a34a',
              borderRadius: 16,
              paddingVertical: 20,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 }}>
              Start Recording
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Active recording screen ──────────────────────────────────────────────────

interface RecordingScreenProps {
  elapsedMs: number;
  distanceM: number;
  elevationGainM: number;
  sportType: SportType;
  trackPoints: { lat: number; lng: number; ele?: number; time: string }[];
  sensorValues: ReturnType<typeof useSensors>['sensorValues'];
  isPaused: boolean;
  mapRef: React.RefObject<RoamMapRef>;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function RecordingScreen({
  elapsedMs,
  distanceM,
  elevationGainM,
  sportType,
  trackPoints,
  sensorValues,
  isPaused,
  mapRef,
  onPause,
  onResume,
  onStop,
}: RecordingScreenProps) {
  const sport = SPORTS.find((s) => s.type === sportType) ?? SPORTS[0];
  const gpxPoints: GpxTrackPoint[] = trackPoints;

  return (
    <View style={{ flex: 1, backgroundColor: '#111827' }}>
      {/* Full-screen map */}
      <View style={{ flex: 1 }}>
        <RoamMap ref={mapRef}>
          {gpxPoints.length >= 2 && (
            <TrackPolyline points={gpxPoints} color={sport.color} width={3} />
          )}
        </RoamMap>
      </View>

      {/* Timer overlay */}
      <View
        style={{
          position: 'absolute',
          top: 56,
          left: 0,
          right: 0,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: '#fff', fontSize: 52, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
            {formatElapsed(elapsedMs)}
          </Text>
          {isPaused && (
            <Text style={{ color: '#fbbf24', fontSize: 12, textAlign: 'center', marginTop: 2 }}>
              PAUSED
            </Text>
          )}
        </View>
      </View>

      {/* Bottom stats + controls */}
      <SafeAreaView edges={['bottom']} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
        <View
          style={{
            backgroundColor: 'rgba(17,24,39,0.92)',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 16,
            gap: 12,
          }}
        >
          {/* Stats row */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <StatChip label="Distance" value={formatDistance(distanceM)} />
            <StatChip label="Elevation" value={`+${Math.round(elevationGainM)} m`} />
            {sensorValues.heart_rate != null ? (
              <StatChip label="HR" value={`${sensorValues.heart_rate} bpm`} accent="#ef4444" />
            ) : (
              <StatChip label="Pace" value={formatPace(elapsedMs, distanceM)} />
            )}
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            {isPaused ? (
              <PillButton label="Resume" color="#16a34a" onPress={onResume} flex={2} />
            ) : (
              <PillButton label="Pause" color="#f59e0b" onPress={onPause} flex={2} />
            )}
            <PillButton label="Stop" color="#ef4444" onPress={onStop} flex={1} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function StatChip({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: '#9ca3af', fontSize: 10, marginBottom: 2 }}>{label}</Text>
      <Text style={{ color: accent ?? '#f9fafb', fontSize: 16, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

function PillButton({
  label, color, onPress, flex,
}: { label: string; color: string; onPress: () => void; flex: number }) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex, backgroundColor: color, borderRadius: 14, paddingVertical: 14, alignItems: 'center' }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{label}</Text>
    </Pressable>
  );
}

// ─── Post-activity screen ─────────────────────────────────────────────────────

interface PostScreenProps {
  elapsedMs: number;
  distanceM: number;
  elevationGainM: number;
  sportType: SportType;
  trackPoints: { lat: number; lng: number; ele?: number; time: string }[];
  sensorReadings: { t: number; hr?: number; cad?: number; power?: number }[];
  isSaving: boolean;
  saveError: string | null;
  onSave: () => void;
  onExportGpx: () => void;
  onDiscard: () => void;
}

function PostScreen({
  elapsedMs,
  distanceM,
  elevationGainM,
  sportType,
  trackPoints,
  sensorReadings,
  isSaving,
  saveError,
  onSave,
  onExportGpx,
  onDiscard,
}: PostScreenProps) {
  const sport = SPORTS.find((s) => s.type === sportType) ?? SPORTS[0];

  const hrValues = sensorReadings.filter((r) => r.hr != null).map((r) => r.hr!);
  const avgHr = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null;
  const maxHr = hrValues.length ? Math.max(...hrValues) : null;

  // Build elevation chart data
  const elevChartData: ChartPoint[] = trackPoints
    .filter((p) => p.ele != null)
    .map((p, i) => ({ x: i, y: p.ele! }));

  // Build HR chart data
  const hrChartData: ChartPoint[] = sensorReadings
    .filter((r) => r.hr != null)
    .map((r, i) => ({ x: i, y: r.hr! }));

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-2xl font-bold text-gray-900">Activity Summary</Text>

        {/* Stats grid */}
        <View
          style={{
            backgroundColor: '#f9fafb',
            borderRadius: 16,
            padding: 16,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <SummaryTile label="Duration"  value={formatElapsed(elapsedMs)} />
          <SummaryTile label="Distance"  value={formatDistance(distanceM)} />
          <SummaryTile label="Elevation" value={`+${Math.round(elevationGainM)} m`} />
          <SummaryTile label="Avg Pace"  value={formatPace(elapsedMs, distanceM)} />
          {avgHr != null && <SummaryTile label="Avg HR" value={`${avgHr} bpm`} />}
          {maxHr != null && <SummaryTile label="Max HR" value={`${maxHr} bpm`} />}
        </View>

        {/* Elevation chart */}
        {elevChartData.length >= 2 && (
          <View>
            <ChartSvg
              data={elevChartData}
              color={sport.color}
              label="Elevation (m)"
              width={SCREEN_W - 40}
              height={130}
            />
          </View>
        )}

        {/* HR chart */}
        {hrChartData.length >= 2 && (
          <View>
            <ChartSvg
              data={hrChartData}
              color="#ef4444"
              label="Heart Rate (bpm)"
              width={SCREEN_W - 40}
              height={130}
              formatY={(v) => String(Math.round(v))}
            />
          </View>
        )}

        {/* Error */}
        {saveError != null && (
          <Text style={{ color: '#ef4444', fontSize: 13, textAlign: 'center' }}>{saveError}</Text>
        )}

        {/* Action buttons */}
        <Pressable
          onPress={onSave}
          disabled={isSaving}
          style={{
            backgroundColor: isSaving ? '#86efac' : '#16a34a',
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {isSaving && <ActivityIndicator color="#fff" size="small" />}
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
            {isSaving ? 'Saving…' : 'Save Activity'}
          </Text>
        </Pressable>

        <Pressable
          onPress={onExportGpx}
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#374151', fontWeight: '600', fontSize: 15 }}>Export GPX</Text>
        </Pressable>

        <Pressable
          onPress={onDiscard}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ color: '#9ca3af', fontSize: 14 }}>Discard activity</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '47%', gap: 2 }}>
      <Text style={{ color: '#6b7280', fontSize: 11 }}>{label}</Text>
      <Text style={{ color: '#111827', fontSize: 18, fontWeight: '700' }}>{value}</Text>
    </View>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function RecordScreen() {
  const store = useRecordingStore();
  const mapRef = useRef<RoamMapRef>(null);
  const [tick, setTick] = useState(0); // drives re-render for timer

  const gps = useGPS((point) => {
    store.addTrackPoint(point);
    mapRef.current?.flyTo(point.lng, point.lat);
  });

  const sensors = useSensors((reading) => {
    if (store.phase === 'recording') store.addSensorReading(reading);
  });

  // Tick every second while recording
  useEffect(() => {
    if (store.phase !== 'recording') return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [store.phase]);

  const handleStart = async () => {
    const ok = await gps.startTracking();
    if (!ok) return;
    store.startRecording();
  };

  const handlePause = () => {
    gps.stopTracking();
    store.pauseRecording();
  };

  const handleResume = async () => {
    store.resumeRecording();
    await gps.startTracking();
  };

  const handleStop = () => {
    Alert.alert('Stop recording?', 'You can save or discard after.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => {
          gps.stopTracking();
          store.stopRecording();
        },
      },
    ]);
  };

  const handleSave = async () => {
    try {
      await store.saveActivity();
      Alert.alert('Saved!', 'Your activity has been saved.');
      store.discardActivity();
    } catch {
      // saveError already set in store
    }
  };

  const handleExportGpx = async () => {
    try {
      const gpxContent = buildGpxFromTrack('Activity', '', store.trackPoints);
      await shareGpxFile(`activity_${Date.now()}.gpx`, gpxContent);
    } catch (err) {
      Alert.alert('Export failed', err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const handleDiscard = () => {
    Alert.alert('Discard activity?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => store.discardActivity() },
    ]);
  };

  const elapsedMs = store.getElapsedMs();

  if (store.phase === 'pre') {
    return (
      <PreScreen
        sportType={store.sportType}
        onSetSport={store.setSportType}
        sensors={sensors}
        onStart={handleStart}
      />
    );
  }

  if (store.phase === 'recording' || store.phase === 'paused') {
    return (
      <RecordingScreen
        elapsedMs={elapsedMs}
        distanceM={store.distanceM}
        elevationGainM={store.elevationGainM}
        sportType={store.sportType}
        trackPoints={store.trackPoints}
        sensorValues={sensors.sensorValues}
        isPaused={store.phase === 'paused'}
        mapRef={mapRef}
        onPause={handlePause}
        onResume={handleResume}
        onStop={handleStop}
      />
    );
  }

  return (
    <PostScreen
      elapsedMs={elapsedMs}
      distanceM={store.distanceM}
      elevationGainM={store.elevationGainM}
      sportType={store.sportType}
      trackPoints={store.trackPoints}
      sensorReadings={store.sensorReadings}
      isSaving={store.isSaving}
      saveError={store.saveError}
      onSave={handleSave}
      onExportGpx={handleExportGpx}
      onDiscard={handleDiscard}
    />
  );
}
