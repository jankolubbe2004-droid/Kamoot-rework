// Primary source of truth — all database-level types come from here
export type {
  Json,
  Database,
  UserPlan,
  SportType,
  Difficulty,
  WaypointJson     as Waypoint,
  ActivityPhotoJson,
  SensorReadingJson,
  Tables,
  TablesInsert,
  TablesUpdate,
  DbResult,
  DbResultOk,
  ProfileRow       as Profile,
  RouteRow         as Route,
  ActivityRow      as Activity,
  RoutePhotoRow    as RoutePhoto,
  RouteRatingRow   as RouteRating,
  SensorReadingRow,
  RouteWithProfile,
  RouteWithStats,
} from './database'

// ─── App-level types (not stored in the DB) ───────────────────────────────────

export interface RouteFilters {
  sport_type?:    import('./database').SportType
  difficulty?:    import('./database').Difficulty
  max_distance_m?: number
  query?:         string
}

export interface RecordingState {
  isRecording:    boolean
  isPaused:       boolean
  startedAt:      Date | null
  distance_m:     number
  elevation_gain_m: number
  currentLat:     number | null
  currentLng:     number | null
}

export interface GpxTrackPoint {
  lat:   number
  lng:   number
  ele?:  number
  time?: string
}

export interface GpxRoute {
  name:         string
  description?: string
  points:       GpxTrackPoint[]
}
