import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';
import { calculateDistanceM } from '../lib/routing';
import type { SportType, SensorReadingJson } from '../types';

export interface TrackPoint {
  lat: number;
  lng: number;
  ele?: number;
  time: string; // ISO-8601
}

export type RecordPhase = 'pre' | 'recording' | 'paused' | 'post';

interface RecordingStore {
  phase: RecordPhase;
  sportType: SportType;

  // Timing — stored as timestamps so we can derive elapsed any time
  activityStartedAt: number | null; // Date.now() of very first Start press
  segmentStartMs: number | null;    // Date.now() of last Start / Resume press
  pausedAccMs: number;              // elapsed ms accumulated before current segment

  // Track data
  trackPoints: TrackPoint[];
  distanceM: number;
  elevationGainM: number;

  // Sensor data collected during the activity
  sensorReadings: SensorReadingJson[];

  // Save state
  savedActivityId: string | null;
  isSaving: boolean;
  saveError: string | null;

  // ── Actions ──────────────────────────────────────────────────────────────
  setSportType: (type: SportType) => void;
  startRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  addTrackPoint: (point: TrackPoint) => void;
  addSensorReading: (reading: SensorReadingJson) => void;
  saveActivity: () => Promise<string>;
  discardActivity: () => void;

  // ── Derived ───────────────────────────────────────────────────────────────
  getElapsedMs: () => number;
}

const INITIAL: Pick<
  RecordingStore,
  | 'phase' | 'activityStartedAt' | 'segmentStartMs' | 'pausedAccMs'
  | 'trackPoints' | 'distanceM' | 'elevationGainM' | 'sensorReadings'
  | 'savedActivityId' | 'isSaving' | 'saveError'
> = {
  phase: 'pre',
  activityStartedAt: null,
  segmentStartMs: null,
  pausedAccMs: 0,
  trackPoints: [],
  distanceM: 0,
  elevationGainM: 0,
  sensorReadings: [],
  savedActivityId: null,
  isSaving: false,
  saveError: null,
};

export const useRecordingStore = create<RecordingStore>((set, get) => ({
  ...INITIAL,
  sportType: 'hiking',

  setSportType: (sportType) => set({ sportType }),

  startRecording: () => {
    const now = Date.now();
    set({
      phase: 'recording',
      activityStartedAt: now,
      segmentStartMs: now,
      pausedAccMs: 0,
    });
  },

  pauseRecording: () => {
    const { segmentStartMs, pausedAccMs } = get();
    const extra = segmentStartMs != null ? Date.now() - segmentStartMs : 0;
    set({ phase: 'paused', segmentStartMs: null, pausedAccMs: pausedAccMs + extra });
  },

  resumeRecording: () => {
    set({ phase: 'recording', segmentStartMs: Date.now() });
  },

  stopRecording: () => {
    const { segmentStartMs, pausedAccMs } = get();
    const extra = segmentStartMs != null ? Date.now() - segmentStartMs : 0;
    set({ phase: 'post', segmentStartMs: null, pausedAccMs: pausedAccMs + extra });
  },

  addTrackPoint: (point) =>
    set((s) => {
      const pts = s.trackPoints;
      let distDelta = 0;
      let elevDelta = 0;
      if (pts.length > 0) {
        const last = pts[pts.length - 1];
        distDelta = calculateDistanceM(last.lat, last.lng, point.lat, point.lng);
        if (point.ele != null && last.ele != null && point.ele > last.ele) {
          elevDelta = point.ele - last.ele;
        }
      }
      return {
        trackPoints: [...pts, point],
        distanceM: s.distanceM + distDelta,
        elevationGainM: s.elevationGainM + elevDelta,
      };
    }),

  addSensorReading: (reading) =>
    set((s) => ({ sensorReadings: [...s.sensorReadings, reading] })),

  saveActivity: async () => {
    const {
      activityStartedAt, pausedAccMs, trackPoints, distanceM, elevationGainM,
      sensorReadings, sportType,
    } = get();

    const user = useAuthStore.getState().user;
    if (!user) throw new Error('You must be signed in to save an activity');

    set({ isSaving: true, saveError: null });
    try {
      const startedAt  = activityStartedAt
        ? new Date(activityStartedAt).toISOString()
        : new Date().toISOString();
      const finishedAt = new Date().toISOString();

      const hrValues = sensorReadings.filter((r) => r.hr != null).map((r) => r.hr!);
      const avg_hr   = hrValues.length ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length) : null;
      const max_hr   = hrValues.length ? Math.max(...hrValues) : null;

      const { data, error } = await supabase
        .from('activities')
        .insert({
          user_id:          user.id,
          started_at:       startedAt,
          finished_at:      finishedAt,
          distance_m:       Math.round(distanceM),
          elevation_gain_m: Math.round(elevationGainM),
          avg_hr,
          max_hr,
          photos:           [],
        })
        .select('id')
        .single();

      if (error) throw error;
      const activityId = data.id as string;

      // Persist sensor readings if any were collected
      if (sensorReadings.length > 0) {
        await supabase.from('sensor_readings').insert({
          activity_id: activityId,
          data: sensorReadings,
        });
      }

      set({ savedActivityId: activityId });
      return activityId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save activity';
      set({ saveError: msg });
      throw new Error(msg);
    } finally {
      set({ isSaving: false });
    }
  },

  discardActivity: () => set({ ...INITIAL, sportType: get().sportType }),

  getElapsedMs: () => {
    const { segmentStartMs, pausedAccMs } = get();
    return segmentStartMs != null ? Date.now() - segmentStartMs + pausedAccMs : pausedAccMs;
  },
}));
