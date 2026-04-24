export type {
  UserPlan,
  SportType,
  Difficulty,
  Waypoint,
  Profile,
  Route,
  Activity,
  ActivityPhoto,
  RoutePhoto,
  RouteRating,
  SensorReading,
  SensorReadings,
  GpxTrackPoint,
  GpxRoute,
} from '@roamfree/shared';

export interface RouteFilters {
  sport_type?: import('@roamfree/shared').SportType;
  difficulty?: import('@roamfree/shared').Difficulty;
  max_distance_m?: number;
  query?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  startedAt: Date | null;
  distance_m: number;
  elevation_gain_m: number;
  currentLat: number | null;
  currentLng: number | null;
}
