import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  sensorManager,
  type ConnectedSensor,
  type SensorReading,
  type SensorType,
} from '../lib/sensors';
import type { SensorReadingJson } from '../types';

interface UseSensorsReturn {
  connectedSensors: ConnectedSensor[];
  sensorValues: Partial<Record<SensorType, number>>;
  isScanning: boolean;
  scan: () => Promise<void>;
  disconnect: (deviceId: string) => Promise<void>;
  disconnectAll: () => Promise<void>;
}

/**
 * Manages BLE sensor scanning, connection, and live readings.
 * `onReading` receives a SensorReadingJson timestamped to the reading moment;
 * pass an inline function safely — stored in a ref internally.
 */
export function useSensors(
  onReading?: (reading: SensorReadingJson) => void,
): UseSensorsReturn {
  const [connectedSensors, setConnectedSensors] = useState<ConnectedSensor[]>([]);
  const [sensorValues, setSensorValues]         = useState<Partial<Record<SensorType, number>>>({});
  const [isScanning, setIsScanning]             = useState(false);

  const scanStopRef  = useRef<{ stop: () => void } | null>(null);
  const onReadingRef = useRef(onReading);
  onReadingRef.current = onReading;

  // Subscribe to all sensor readings for the lifetime of the component
  useEffect(() => {
    const unsub = sensorManager.onReading((r: SensorReading) => {
      setSensorValues((prev) => ({ ...prev, [r.type]: r.value }));

      if (onReadingRef.current) {
        const json: SensorReadingJson = {
          t:     r.timestamp,
          hr:    r.type === 'heart_rate' ? r.value : undefined,
          cad:   r.type === 'cadence'    ? r.value : undefined,
          power: r.type === 'power'      ? r.value : undefined,
        };
        onReadingRef.current(json);
      }
    });

    return () => {
      unsub();
      scanStopRef.current?.stop();
    };
  }, []);

  const scan = async (): Promise<void> => {
    const ok = await sensorManager.requestPermissions();
    if (!ok) {
      Alert.alert('Bluetooth required', 'Enable Bluetooth to connect sensors.');
      return;
    }
    const ready = await sensorManager.waitForBleReady();
    if (!ready) {
      Alert.alert('Bluetooth off', 'Turn on Bluetooth and try again.');
      return;
    }

    setIsScanning(true);
    scanStopRef.current = sensorManager.scanForSensors(
      async (device) => {
        scanStopRef.current?.stop();
        setIsScanning(false);
        try {
          const sensor = await sensorManager.connectSensor(device);
          setConnectedSensors((prev) => [
            ...prev.filter((s) => s.deviceId !== sensor.deviceId),
            sensor,
          ]);
        } catch (err) {
          Alert.alert('Connection failed', err instanceof Error ? err.message : 'Unknown error');
        }
      },
      () => setIsScanning(false),
    );

    // Auto-stop scan after 15 s
    setTimeout(() => {
      scanStopRef.current?.stop();
      setIsScanning(false);
    }, 15_000);
  };

  const disconnect = async (deviceId: string): Promise<void> => {
    await sensorManager.disconnectSensor(deviceId);
    setConnectedSensors((prev) => prev.filter((s) => s.deviceId !== deviceId));
    setSensorValues((prev) => {
      // Remove the value associated with disconnected sensor's type
      const sensor = connectedSensors.find((s) => s.deviceId === deviceId);
      if (!sensor) return prev;
      const { [sensor.type]: _, ...rest } = prev;
      return rest;
    });
  };

  const disconnectAll = async (): Promise<void> => {
    await sensorManager.disconnectAll();
    setConnectedSensors([]);
    setSensorValues({});
  };

  return { connectedSensors, sensorValues, isScanning, scan, disconnect, disconnectAll };
}
