import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'
import type { Database } from '../types/database'

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

if (__DEV__ && (!supabaseUrl || !supabaseAnon)) {
  console.warn('[supabase] Missing env vars — copy .env.example to .env.local and fill in values.')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
})

// ─── Typed table helpers ──────────────────────────────────────────────────────
// Use these instead of supabase.from('table_name') for autocomplete on columns.

export const db = {
  profiles:       () => supabase.from('profiles'),
  routes:         () => supabase.from('routes'),
  activities:     () => supabase.from('activities'),
  routePhotos:    () => supabase.from('route_photos'),
  routeRatings:   () => supabase.from('route_ratings'),
  sensorReadings: () => supabase.from('sensor_readings'),
} as const

// ─── Storage bucket helpers ───────────────────────────────────────────────────

export const storage = {
  gpxFiles:    supabase.storage.from('gpx-files'),
  routePhotos: supabase.storage.from('route-photos'),
  avatars:     supabase.storage.from('avatars'),
} as const

// ─── Signed-URL helper ───────────────────────────────────────────────────────

export async function getSignedUrl(
  bucket: 'gpx-files' | 'route-photos' | 'avatars',
  path: string,
  expiresInSeconds = 3600
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds)
  if (error || !data) return null
  return data.signedUrl
}

// ─── Public URL helper (for public buckets) ───────────────────────────────────

export function getPublicUrl(
  bucket: 'route-photos' | 'avatars',
  path: string
): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path)
  return data.publicUrl
}
