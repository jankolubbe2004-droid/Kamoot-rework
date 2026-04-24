import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityStats, type LiveStats } from '../../components/Activity/ActivityStats';
import { SensorStatus } from '../../components/Activity/SensorStatus';
import { RoamMap, type RoamMapRef } from '../../components/Map/RoamMap';
import { TrackPolyline } from '../../components/Map/TrackPolyline';
import { Button } from '../../components/ui/Button';
import { calculateDistanceM } from '../../lib/routing';
import { sensorManager, type ConnectedSensor, type SensorType } from '../../lib/sensors';
import type { GpxTrackPoint } from '../../types';

interface LocationPoint { lat: number; lng: number; ele?: number; time: string }
type RecordState = 'idle' | 'recording' | 'paused';

export default function RecordScreen() {
  const mapRef = useRef<RoamMapRef>(null);
  const [state, setState] = useState<RecordState>('idle');
  const [trackPoints, setTrackPoints] = useState<LocationPoint[]>([]);
  const [distanceM, setDistanceM] = useState(0);
  const [elevationGainM, setElevationGainM] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Sensors
  const [connectedSensors, setConnectedSensors] = useState<ConnectedSensor[]>([]);
  const [sensorValues, setSensorValues] = useState<Partial<Record<SensorType, number>>>({});
  const [isScanning, setIsScanning] = useState(false);
  const scanRef = useRef<{ stop: () => void } | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const locationSub = useRef<Location.LocationSubscription | null>(null);
  const startTimeRef = useRef(0);
  const pausedElapsedRef = useRef(0);

  useEffect(() => {
    const unsub = sensorManager.onReading((r) =>
      setSensorValues((prev) => ({ ...prev, [r.type]: r.value }))
    );
    return () => {
      unsub();
      clearInterval(intervalRef.current!);
      locationSub.current?.remove();
      scanRef.current?.stop();
    };
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Location required', 'RoamFree needs location to record your activity.');
      return false;
    }
    return true;
  };

  const startTimer = () => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000) + pausedElapsedRef.current);
    }, 1000);
  };

  const startLocationTracking = async () => {
    locationSub.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 5 },
      (loc) => {
        const point: LocationPoint = {
          lat: loc.coords.latitude, lng: loc.coords.longitude,
          ele: loc.coords.altitude ?? undefined,
          time: new Date(loc.timestamp).toISOString(),
        };
        setTrackPoints((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            setDistanceM((d) => d + calculateDistanceM(last.lat, last.lng, point.lat, point.lng));
            if (point.ele != null && last.ele != null && point.ele > last.ele) {
              setElevationGainM((e) => e + (point.ele! - last.ele!));
            }
          }
          return [...prev, point];
        });
        mapRef.current?.flyTo(point.lng, point.lat);
      }
    );
  };

  const handleStart = async () => {
    if (!(await requestLocationPermission())) return;
    setState('recording');
    pausedElapsedRef.current = 0;
    startTimer();
    await startLocationTracking();
  };

  const handlePause = () => {
    pausedElapsedRef.current = elapsed;
    clearInterval(intervalRef.current!);
    locationSub.current?.remove();
    setState('paused');
  };

  const handleResume = async () => {
    setState('recording');
    startTimer();
    await startLocationTracking();
  };

  const handleStop = () => {
    Alert.alert('Stop recording?', 'Your activity will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop & Save', style: 'destructive',
        onPress: () => {
          clearInterval(intervalRef.current!);
          locationSub.current?.remove();
          const summary = `Distance: ${(distanceM / 1000).toFixed(2)} km`;
          setState('idle');
          setElapsed(0); setDistanceM(0); setElevationGainM(0); setTrackPoints([]);
          Alert.alert('Activity saved!', summary);
        },
      },
    ]);
  };

  const handleScan = async () => {
    const ok = await sensorManager.requestPermissions();
    if (!ok) { Alert.alert('Bluetooth required', 'Enable Bluetooth to connect sensors.'); return; }
    const bleReady = await sensorManager.waitForBleReady();
    if (!bleReady) { Alert.alert('Bluetooth off', 'Turn on Bluetooth to scan for sensors.'); return; }

    setIsScanning(true);
    scanRef.current = sensorManager.scanForSensors(
      async (device, _type) => {
        scanRef.current?.stop();
        setIsScanning(false);
        try {
          const sensor = await sensorManager.connectSensor(device);
          setConnectedSensors((prev) => [...prev.filter((s) => s.deviceId !== sensor.deviceId), sensor]);
        } catch (e) {
          Alert.alert('Connection failed', e instanceof Error ? e.message : 'Unknown error');
        }
      },
      () => setIsScanning(false)
    );
    setTimeout(() => { scanRef.current?.stop(); setIsScanning(false); }, 15000);
  };

  const handleDisconnect = async (deviceId: string) => {
    await sensorManager.disconnectSensor(deviceId);
    setConnectedSensors((prev) => prev.filter((s) => s.deviceId !== deviceId));
  };

  const liveStats: LiveStats = {
    elapsedMs: elapsed * 1000,
    distanceM,
    elevationGainM,
    heartRate: sensorValues.heart_rate ?? null,
    cadence: sensorValues.cadence ?? null,
    power: sensorValues.power ?? null,
    currentPaceSecPerKm: distanceM > 50 ? (elapsed / (distanceM / 1000)) : null,
  };

  const gpxPoints: GpxTrackPoint[] = trackPoints.map((p) => ({ lat: p.lat, lng: p.lng, ele: p.ele, time: p.time }));

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">Record Activity</Text>
      </View>

      <View className="flex-1 relative">
        <RoamMap ref={mapRef}>
          {gpxPoints.length >= 2 && <TrackPolyline points={gpxPoints} color="#ef4444" width={3} />}
        </RoamMap>

        <View className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl shadow-lg overflow-hidden">
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-4 gap-y-4">
              <ActivityStats stats={liveStats} />

              <SensorStatus
                connectedSensors={connectedSensors}
                sensorValues={sensorValues}
                isScanning={isScanning}
                onScanPress={handleScan}
                onDisconnect={handleDisconnect}
              />

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
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}
