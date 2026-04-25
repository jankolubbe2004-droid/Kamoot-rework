import type { SportType, Waypoint, GpxTrackPoint } from '../types';

const GRAPHHOPPER_URL = process.env.EXPO_PUBLIC_GRAPHHOPPER_URL ?? 'http://localhost:8989';

const SPORT_TO_PROFILE: Record<SportType, string> = {
  hiking: 'hike',
  trail_running: 'hike',
  walking: 'foot',
  cycling: 'bike',
  mountain_biking: 'mtb',
};

export interface RouteResult {
  points: GpxTrackPoint[];
  distance_m: number;
  elevation_gain_m: number;
  duration_ms: number;
}

export async function calculateRoute(
  waypoints: Waypoint[],
  sportType: SportType
): Promise<RouteResult> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }

  const profile = SPORT_TO_PROFILE[sportType] ?? 'hike';
  const points = waypoints.map((w) => `${w.lat},${w.lng}`).join('&point=');

  const url = `${GRAPHHOPPER_URL}/route?point=${points}&profile=${profile}&points_encoded=false&elevation=true`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GraphHopper error: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const path = json.paths?.[0];
  if (!path) {
    throw new Error('No route found');
  }

  const coords: [number, number, number?][] = path.points?.coordinates ?? [];
  const routePoints: GpxTrackPoint[] = coords.map(([lng, lat, ele]) => ({
    lat,
    lng,
    ele,
  }));

  return {
    points: routePoints,
    distance_m: path.distance ?? 0,
    elevation_gain_m: path.ascend ?? 0,
    duration_ms: path.time ?? 0,
  };
}

export function calculateDistanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  return `${hours}h ${minutes}min`;
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`;
}

export interface ElevationPoint {
  distanceM: number;
  elevationM: number;
}

export function generateElevationProfile(
  waypoints: { lat: number; lng: number; ele?: number }[],
  samplesPerSegment = 10
): ElevationPoint[] {
  if (waypoints.length < 2) return [];

  const points: ElevationPoint[] = [];
  let totalDist = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const segDist = calculateDistanceM(a.lat, a.lng, b.lat, b.lng);
    const baseA = a.ele ?? 150 + deterministicNoise(a.lat, a.lng) * 100;
    const baseB = b.ele ?? 150 + deterministicNoise(b.lat, b.lng) * 100;

    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const lat = a.lat + (b.lat - a.lat) * t;
      const lng = a.lng + (b.lng - a.lng) * t;
      const noise = deterministicNoise(lat * 17.3 + s, lng * 13.7 + s) * 15;
      points.push({
        distanceM: totalDist + segDist * t,
        elevationM: baseA + (baseB - baseA) * t + noise,
      });
    }

    totalDist += segDist;
  }

  // Final point
  const last = waypoints[waypoints.length - 1];
  points.push({
    distanceM: totalDist,
    elevationM: last.ele ?? 150 + deterministicNoise(last.lat, last.lng) * 100,
  });

  return points;
}

function deterministicNoise(x: number, y: number): number {
  return Math.sin(x * 317.3 + y * 193.7) * 0.5 + Math.sin(x * 53.1 + y * 79.4) * 0.5;
}
