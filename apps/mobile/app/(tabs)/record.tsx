import { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { RoamMap, type RoamMapRef } from '../../components/Map/RoamMap';
import { Button } from '../../components/ui/Button';
import { formatDistance, formatDuration, calculateDistanceM } from '../../lib/routing';
import type { GpxTrackPoint } from '../../types';

interface LocationPoint {
  lat: number;
  lng: number;
  ele?: number;
  time: string;
}

type RecordState = 'idle' | 'recording' | 'paused';

export default function RecordScreen() {
  const mapRef = useRef<RoamMapRef>(null);
  const [state, setState] = useState<RecordState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [distanceM, setDistanceM] = useState(0);
  const [trackPoints, setTrackPoints] = useState<LocationPoint[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedElapsedRef = useRef<number>(0);

  const cleanup = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    locationSub.current?.remove();
  };

  useEffect(() => () => cleanup(), []);

  const requestPermissions = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Location required',
        'RoamFree needs location access to record your activity.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleStart = async () => {
    const granted = await requestPermissions();
    if (!granted) return;

    setState('recording');
    startTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
    }, 1000);

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const point: LocationPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          ele: loc.coords.altitude ?? undefined,
          time: new Date(loc.timestamp).toISOString(),
        };

        setTrackPoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const d = calculateDistanceM(last.lat, last.lng, point.lat, point.lng);
            setDistanceM((dm) => dm + d);
          }
          return [...prev, point];
        });

        mapRef.current?.flyTo(point.lng, point.lat);
      }
    );
  };

  const handlePause = () => {
    setState('paused');
    pausedElapsedRef.current = elapsed;
    if (intervalRef.current) clearInterval(intervalRef.current);
    locationSub.current?.remove();
  };

  const handleResume = async () => {
    setState('recording');
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
    }, 1000);

    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const point: LocationPoint = {
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
          ele: loc.coords.altitude ?? undefined,
          time: new Date(loc.timestamp).toISOString(),
        };
        setTrackPoints((prev) => [...prev, point]);
      }
    );
  };

  const handleStop = () => {
    Alert.alert('Stop recording?', 'Your activity will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop & Save',
        style: 'destructive',
        onPress: () => {
          cleanup();
          setState('idle');
          setElapsed(0);
          setDistanceM(0);
          setTrackPoints([]);
          Alert.alert('Activity saved!', `Distance: ${formatDistance(distanceM)}`);
        },
      },
    ]);
  };

  const trackGpxPoints: GpxTrackPoint[] = trackPoints.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    ele: p.ele,
    time: p.time,
  }));

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="flex-1">
        <View className="px-4 pt-4 pb-2">
          <Text className="text-2xl font-bold text-gray-900">Record Activity</Text>
        </View>

        <View className="flex-1 relative">
          <RoamMap ref={mapRef}>
            {trackPoints.length >= 2 && (
              <TrackLine points={trackGpxPoints} />
            )}
          </RoamMap>

          {/* Stats overlay */}
          <View className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg p-4">
            <View className="flex-row justify-around mb-4">
              <StatBox label="Duration" value={formatDuration(elapsed * 1000)} />
              <View className="w-px bg-gray-200" />
              <StatBox label="Distance" value={formatDistance(distanceM)} />
              <View className="w-px bg-gray-200" />
              <StatBox label="Points" value={String(trackPoints.length)} />
            </View>

            <View className="flex-row gap-x-3">
              {state === 'idle' && (
                <Button label="Start Recording" onPress={handleStart} fullWidth size="lg" />
              )}
              {state === 'recording' && (
                <>
                  <Button label="Pause" onPress={handlePause} variant="secondary" fullWidth />
                  <Button label="Stop" onPress={handleStop} variant="danger" fullWidth />
                </>
              )}
              {state === 'paused' && (
                <>
                  <Button label="Resume" onPress={handleResume} fullWidth />
                  <Button label="Stop" onPress={handleStop} variant="danger" fullWidth />
                </>
              )}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center flex-1">
      <Text className="text-lg font-bold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}

// Lazy import to avoid circular deps
function TrackLine({ points }: { points: GpxTrackPoint[] }) {
  const { TrackPolyline } = require('../../components/Map/TrackPolyline');
  return <TrackPolyline points={points} color="#ef4444" width={3} />;
}
