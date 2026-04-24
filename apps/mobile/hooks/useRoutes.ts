import { useEffect } from 'react';
import { useRouteStore } from '../stores/routeStore';
import type { RouteFilters } from '../types';

export function usePublicRoutes(filters?: RouteFilters) {
  const { publicRoutes, isLoadingPublic, publicError, fetchPublicRoutes } = useRouteStore();

  useEffect(() => {
    fetchPublicRoutes(filters);
  }, []);

  return {
    routes: publicRoutes,
    isLoading: isLoadingPublic,
    error: publicError,
    refresh: () => fetchPublicRoutes(filters),
  };
}

export function useMyRoutes() {
  const { myRoutes, isLoadingMine, myError, fetchMyRoutes } = useRouteStore();

  useEffect(() => {
    fetchMyRoutes();
  }, []);

  return {
    routes: myRoutes,
    isLoading: isLoadingMine,
    error: myError,
    refresh: fetchMyRoutes,
  };
}
