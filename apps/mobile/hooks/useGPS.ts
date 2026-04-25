import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import type { TrackPoint } from '../stores/recordingStore';

interface UseGPSReturn {
  startTracking: () => Promise<boolean>;
  stopTracking: () => void;
  isTracking: boolean;
  permissionDenied: boolean;
}

/**
 * Wraps expo-location watchPositionAsync.
 * `onPoint` is called with each new GPS fix; safe to pass an inline function —
 * the hook stores it in a ref so stale-closure issues are avoided.
 */
export function useGPS(onPoint: (point: TrackPoint) => void): UseGPSReturn {
  const [isTracking, setIsTracking]         = useState(false);
  const [permissionDenied, setPermDenied]   = useState(false);

  const subRef      = useRef<Location.LocationSubscription | null>(null);
  const onPointRef  = useRef(onPoint);
  onPointRef.current = onPoint; // always latest

  const startTracking = async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermDenied(true);
      return false;
    }

    // Stop any existing subscription before starting a new one
    subRef.current?.remove();

    subRef.current = await Location.watchPositionAsync(
      {
        accuracy:         Location.Accuracy.BestForNavigation,
        distanceInterval: 5,   // only fire when moved ≥ 5 m
        timeInterval:     3000, // or every 3 s at minimum
      },
      (loc) => {
        onPointRef.current({
          lat:  loc.coords.latitude,
          lng:  loc.coords.longitude,
          ele:  loc.coords.altitude ?? undefined,
          time: new Date(loc.timestamp).toISOString(),
        });
      },
    );

    setIsTracking(true);
    return true;
  };

  const stopTracking = () => {
    subRef.current?.remove();
    subRef.current = null;
    setIsTracking(false);
  };

  // Clean up on unmount
  useEffect(() => () => stopTracking(), []);

  return { startTracking, stopTracking, isTracking, permissionDenied };
}
