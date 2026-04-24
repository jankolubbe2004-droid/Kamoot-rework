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
