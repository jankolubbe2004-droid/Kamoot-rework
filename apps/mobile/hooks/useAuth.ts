import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const { session, user, profile, isLoading, error } = useAuthStore();
  return {
    session,
    user,
    profile,
    isLoading,
    error,
    isAuthenticated: !!session,
    isPremium: profile?.plan === 'explorer' || profile?.plan === 'lifetime',
    isLifetime: profile?.plan === 'lifetime',
  };
}
