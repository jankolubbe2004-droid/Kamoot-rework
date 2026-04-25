// Auto-mirrored from supabase/migrations/001_initial_schema.sql
// Update this file when the schema changes.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ─── Strongly-typed JSONB fields ─────────────────────────────────────────────

export interface WaypointJson {
  lat: number
  lng: number
  title?: string
  note?: string
}

export interface ActivityPhotoJson {
  storage_path: string
  caption?: string | null
  lat?: number | null
  lng?: number | null
}

export interface SensorReadingJson {
  t: number        // unix timestamp ms
  hr?: number      // heart rate bpm
  cad?: number     // cadence rpm
  power?: number   // power watts
  lat?: number
  lng?: number
  ele?: number     // elevation metres
}

// ─── Domain enums ─────────────────────────────────────────────────────────────

export type UserPlan     = 'free' | 'explorer' | 'lifetime'
export type SportType    = 'hiking' | 'cycling' | 'trail_running' | 'mountain_biking' | 'walking'
export type Difficulty   = 'easy' | 'moderate' | 'hard' | 'expert'

// ─── Database schema ──────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id:              string
          username:        string
          avatar_url:      string | null
          plan:            UserPlan
          plan_expires_at: string | null
          created_at:      string
        }
        Insert: {
          id:              string
          username:        string
          avatar_url?:     string | null
          plan?:           UserPlan
          plan_expires_at?: string | null
          created_at?:     string
        }
        Update: {
          id?:             string
          username?:       string
          avatar_url?:     string | null
          plan?:           UserPlan
          plan_expires_at?: string | null
          created_at?:     string
        }
        Relationships: []
      }

      routes: {
        Row: {
          id:               string
          user_id:          string
          title:            string
          description:      string | null
          sport_type:       SportType
          distance_m:       number
          elevation_gain_m: number
          difficulty:       Difficulty
          gpx_url:          string | null
          is_public:        boolean
          waypoints:        WaypointJson[]
          created_at:       string
        }
        Insert: {
          id?:              string
          user_id:          string
          title:            string
          description?:     string | null
          sport_type:       SportType
          distance_m?:      number
          elevation_gain_m?: number
          difficulty:       Difficulty
          gpx_url?:         string | null
          is_public?:       boolean
          waypoints?:       WaypointJson[]
          created_at?:      string
        }
        Update: {
          id?:              string
          user_id?:         string
          title?:           string
          description?:     string | null
          sport_type?:      SportType
          distance_m?:      number
          elevation_gain_m?: number
          difficulty?:      Difficulty
          gpx_url?:         string | null
          is_public?:       boolean
          waypoints?:       WaypointJson[]
          created_at?:      string
        }
        Relationships: [
          {
            foreignKeyName: 'routes_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }

      activities: {
        Row: {
          id:               string
          user_id:          string
          route_id:         string | null
          started_at:       string
          finished_at:      string | null
          distance_m:       number
          elevation_gain_m: number
          avg_hr:           number | null
          max_hr:           number | null
          gpx_url:          string | null
          photos:           ActivityPhotoJson[]
          created_at:       string
        }
        Insert: {
          id?:              string
          user_id:          string
          route_id?:        string | null
          started_at:       string
          finished_at?:     string | null
          distance_m?:      number
          elevation_gain_m?: number
          avg_hr?:          number | null
          max_hr?:          number | null
          gpx_url?:         string | null
          photos?:          ActivityPhotoJson[]
          created_at?:      string
        }
        Update: {
          id?:              string
          user_id?:         string
          route_id?:        string | null
          started_at?:      string
          finished_at?:     string | null
          distance_m?:      number
          elevation_gain_m?: number
          avg_hr?:          number | null
          max_hr?:          number | null
          gpx_url?:         string | null
          photos?:          ActivityPhotoJson[]
          created_at?:      string
        }
        Relationships: [
          {
            foreignKeyName: 'activities_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'activities_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          }
        ]
      }

      route_photos: {
        Row: {
          id:           string
          route_id:     string
          user_id:      string
          storage_path: string
          caption:      string | null
          lat:          number | null
          lng:          number | null
          created_at:   string
        }
        Insert: {
          id?:          string
          route_id:     string
          user_id:      string
          storage_path: string
          caption?:     string | null
          lat?:         number | null
          lng?:         number | null
          created_at?:  string
        }
        Update: {
          id?:          string
          route_id?:    string
          user_id?:     string
          storage_path?: string
          caption?:     string | null
          lat?:         number | null
          lng?:         number | null
          created_at?:  string
        }
        Relationships: [
          {
            foreignKeyName: 'route_photos_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'route_photos_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }

      route_ratings: {
        Row: {
          id:         string
          route_id:   string
          user_id:    string
          rating:     number
          review:     string | null
          created_at: string
        }
        Insert: {
          id?:        string
          route_id:   string
          user_id:    string
          rating:     number
          review?:    string | null
          created_at?: string
        }
        Update: {
          id?:        string
          route_id?:  string
          user_id?:   string
          rating?:    number
          review?:    string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'route_ratings_route_id_fkey'
            columns: ['route_id']
            isOneToOne: false
            referencedRelation: 'routes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'route_ratings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }

      sensor_readings: {
        Row: {
          id:          string
          activity_id: string
          data:        SensorReadingJson[]
          created_at:  string
        }
        Insert: {
          id?:         string
          activity_id: string
          data?:       SensorReadingJson[]
          created_at?: string
        }
        Update: {
          id?:         string
          activity_id?: string
          data?:       SensorReadingJson[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sensor_readings_activity_id_fkey'
            columns: ['activity_id']
            isOneToOne: false
            referencedRelation: 'activities'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      route_avg_rating: {
        Args: { route_id: string }
        Returns: number
      }
      user_public_route_count: {
        Args: { user_id: string }
        Returns: number
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// ─── Convenience aliases (mirrors Supabase codegen output) ───────────────────

type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never
export type DbResultOk<T> = T extends PromiseLike<{ data: infer U }> ? Exclude<U, null> : never

// ─── Derived row types (use these throughout the app) ────────────────────────

export type ProfileRow      = Tables<'profiles'>
export type RouteRow        = Tables<'routes'>
export type ActivityRow     = Tables<'activities'>
export type RoutePhotoRow   = Tables<'route_photos'>
export type RouteRatingRow  = Tables<'route_ratings'>
export type SensorReadingRow = Tables<'sensor_readings'>

// Route joined with author profile (used in Discover / route detail)
export type RouteWithProfile = RouteRow & {
  profile: Pick<ProfileRow, 'username' | 'avatar_url'> | null
}

// Route with computed avg rating
export type RouteWithStats = RouteRow & {
  profile: Pick<ProfileRow, 'username' | 'avatar_url'> | null
  avg_rating: number | null
  rating_count: number
}
