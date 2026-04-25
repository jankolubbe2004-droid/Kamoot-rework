import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { calculateRoute, type RouteResult } from '../lib/routing';
import type { Route, Waypoint, SportType, Difficulty, RouteFilters, GpxTrackPoint } from '../types';
import { generateGPX, buildGpxFromWaypoints } from '../lib/gpx';

interface RouteStore {
  // Discovery
  publicRoutes: Route[];
  myRoutes: Route[];
  isLoadingPublic: boolean;
  isLoadingMine: boolean;
  publicError: string | null;
  myError: string | null;

  // Route planner draft
  draftTitle: string;
  draftDescription: string;
  draftSportType: SportType;
  draftDifficulty: Difficulty;
  draftWaypoints: Waypoint[];
  isSaving: boolean;
  saveError: string | null;

  // GraphHopper route calculation
  calculatedRoute: RouteResult | null;
  isCalculating: boolean;
  calcError: string | null;

  // Actions
  fetchPublicRoutes: (filters?: RouteFilters) => Promise<void>;
  fetchMyRoutes: () => Promise<void>;
  setDraftWaypoints: (waypoints: Waypoint[]) => void;
  addWaypoint: (waypoint: Waypoint) => void;
  removeWaypoint: (index: number) => void;
  updateWaypoint: (index: number, updates: Partial<Waypoint>) => void;
  setDraftTitle: (title: string) => void;
  setDraftDescription: (description: string) => void;
  setDraftSportType: (sportType: SportType) => void;
  setDraftDifficulty: (difficulty: Difficulty) => void;
  triggerCalculation: () => Promise<void>;
  saveRoute: (isPublic: boolean) => Promise<Route>;
  deleteRoute: (id: string) => Promise<void>;
  exportRouteGpx: (route: Route) => string;
  exportDraftGpx: () => string;
  exportDraftFitPoints: () => GpxTrackPoint[];
  resetDraft: () => void;
}

const DEFAULT_SPORT: SportType = 'hiking';
const DEFAULT_DIFFICULTY: Difficulty = 'moderate';

export const useRouteStore = create<RouteStore>((set, get) => ({
  publicRoutes: [],
  myRoutes: [],
  isLoadingPublic: false,
  isLoadingMine: false,
  publicError: null,
  myError: null,

  draftTitle: '',
  draftDescription: '',
  draftSportType: DEFAULT_SPORT,
  draftDifficulty: DEFAULT_DIFFICULTY,
  draftWaypoints: [],
  isSaving: false,
  saveError: null,

  calculatedRoute: null,
  isCalculating: false,
  calcError: null,

  fetchPublicRoutes: async (filters) => {
    set({ isLoadingPublic: true, publicError: null });
    try {
      let query = supabase
        .from('routes')
        .select('*, profile:profiles(username, avatar_url)')
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (filters?.sport_type)    query = query.eq('sport_type', filters.sport_type);
      if (filters?.difficulty)    query = query.eq('difficulty', filters.difficulty);
      if (filters?.max_distance_m) query = query.lte('distance_m', filters.max_distance_m);
      if (filters?.query)         query = query.ilike('title', `%${filters.query}%`);

      const { data, error } = await query;
      if (error) throw error;
      set({ publicRoutes: (data ?? []) as Route[] });
    } catch (err) {
      set({ publicError: err instanceof Error ? err.message : 'Failed to load routes' });
    } finally {
      set({ isLoadingPublic: false });
    }
  },

  fetchMyRoutes: async () => {
    set({ isLoadingMine: true, myError: null });
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ myRoutes: (data ?? []) as Route[] });
    } catch (err) {
      set({ myError: err instanceof Error ? err.message : 'Failed to load your routes' });
    } finally {
      set({ isLoadingMine: false });
    }
  },

  setDraftWaypoints: (waypoints) => set({ draftWaypoints: waypoints }),
  addWaypoint: (waypoint) => set((s) => ({ draftWaypoints: [...s.draftWaypoints, waypoint] })),
  removeWaypoint: (index) =>
    set((s) => ({
      draftWaypoints: s.draftWaypoints.filter((_, i) => i !== index),
      calculatedRoute: null,
    })),
  updateWaypoint: (index, updates) =>
    set((s) => {
      const wps = [...s.draftWaypoints];
      wps[index] = { ...wps[index], ...updates };
      return { draftWaypoints: wps };
    }),

  setDraftTitle:       (title)       => set({ draftTitle: title }),
  setDraftDescription: (description) => set({ draftDescription: description }),
  setDraftSportType:   (sportType)   => set({ draftSportType: sportType, calculatedRoute: null }),
  setDraftDifficulty:  (difficulty)  => set({ draftDifficulty: difficulty }),

  triggerCalculation: async () => {
    const { draftWaypoints, draftSportType, isCalculating } = get();
    if (isCalculating || draftWaypoints.length < 2) return;

    set({ isCalculating: true, calcError: null });
    try {
      const result = await calculateRoute(draftWaypoints, draftSportType);
      set({ calculatedRoute: result });
    } catch (err) {
      // Silently store the error — UI shows it as a badge, doesn't block usage
      set({ calcError: err instanceof Error ? err.message : 'Route calculation failed' });
    } finally {
      set({ isCalculating: false });
    }
  },

  saveRoute: async (isPublic) => {
    const {
      draftTitle, draftDescription, draftSportType, draftDifficulty,
      draftWaypoints, calculatedRoute,
    } = get();

    if (!draftTitle.trim()) throw new Error('Route title is required');
    if (draftWaypoints.length < 2) throw new Error('At least 2 waypoints are required');

    set({ isSaving: true, saveError: null });
    try {
      const { data, error } = await supabase
        .from('routes')
        .insert({
          title: draftTitle.trim(),
          description: draftDescription.trim() || null,
          sport_type: draftSportType,
          difficulty: draftDifficulty,
          waypoints: draftWaypoints,
          is_public: isPublic,
          distance_m:       calculatedRoute?.distance_m      ?? 0,
          elevation_gain_m: calculatedRoute?.elevation_gain_m ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      const saved = data as Route;
      set((s) => ({ myRoutes: [saved, ...s.myRoutes] }));
      return saved;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save route';
      set({ saveError: msg });
      throw new Error(msg);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteRoute: async (id) => {
    const { error } = await supabase.from('routes').delete().eq('id', id);
    if (error) throw error;
    set((s) => ({
      myRoutes: s.myRoutes.filter((r) => r.id !== id),
      publicRoutes: s.publicRoutes.filter((r) => r.id !== id),
    }));
  },

  exportRouteGpx: (route) => {
    return buildGpxFromWaypoints(route.title, route.description ?? '', route.waypoints);
  },

  exportDraftGpx: () => {
    const { draftTitle, draftDescription, draftWaypoints, calculatedRoute } = get();
    const name = draftTitle || 'My Route';
    const desc = draftDescription;
    if (calculatedRoute && calculatedRoute.points.length >= 2) {
      return generateGPX(name, desc, calculatedRoute.points, draftWaypoints);
    }
    return generateGPX(name, desc, [], draftWaypoints);
  },

  exportDraftFitPoints: () => {
    const { calculatedRoute, draftWaypoints } = get();
    if (calculatedRoute && calculatedRoute.points.length >= 2) {
      return calculatedRoute.points;
    }
    // Fall back to straight waypoints if no GH result
    return draftWaypoints.map((w) => ({ lat: w.lat, lng: w.lng }));
  },

  resetDraft: () =>
    set({
      draftTitle: '',
      draftDescription: '',
      draftSportType: DEFAULT_SPORT,
      draftDifficulty: DEFAULT_DIFFICULTY,
      draftWaypoints: [],
      calculatedRoute: null,
      calcError: null,
      saveError: null,
    }),
}));
