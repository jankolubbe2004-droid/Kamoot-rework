export type UserPlan = 'free' | 'explorer' | 'lifetime';

export type SportType = 'hiking' | 'cycling' | 'trail_running' | 'mountain_biking' | 'walking';

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'expert';

export interface Waypoint {
  lat: number;
  lng: number;
  title?: string;
  note?: string;
}

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  plan: UserPlan;
  plan_expires_at: string | null;
  created_at: string;
}

export interface Route {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  sport_type: SportType;
  distance_m: number;
  elevation_gain_m: number;
  difficulty: Difficulty;
  gpx_url: string | null;
  is_public: boolean;
  waypoints: Waypoint[];
  created_at: string;
  profile?: Pick<Profile, 'username' | 'avatar_url'>;
}

export interface Activity {
  id: string;
  user_id: string;
  route_id: string | null;
  started_at: string;
  finished_at: string | null;
  distance_m: number;
  elevation_gain_m: number;
  avg_hr: number | null;
  max_hr: number | null;
  gpx_url: string | null;
  photos: ActivityPhoto[];
  created_at: string;
}

export interface ActivityPhoto {
  storage_path: string;
  caption: string | null;
  lat: number | null;
  lng: number | null;
}

export interface RoutePhoto {
  id: string;
  route_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface RouteRating {
  id: string;
  route_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  created_at: string;
}

export interface SensorReading {
  t: number;
  hr?: number;
  cad?: number;
  power?: number;
  lat?: number;
  lng?: number;
  ele?: number;
}

export interface SensorReadings {
  id: string;
  activity_id: string;
  data: SensorReading[];
  created_at: string;
}

export interface GpxTrackPoint {
  lat: number;
  lng: number;
  ele?: number;
  time?: string;
}

export interface GpxRoute {
  name: string;
  description?: string;
  points: GpxTrackPoint[];
}
