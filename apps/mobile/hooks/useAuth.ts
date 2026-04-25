import { useAuthStore } from '../stores/authStore';

export function useAuth() {
  const {
    session, user, profile,
    isLoading, isNewUser, error,
    signInWithEmail, signInWithGoogle, signUpWithEmail,
    sendPasswordReset, signOut,
    updateProfile, completeProfileSetup, clearError,
  } = useAuthStore();

  return {
    // State
    session,
    user,
    profile,
    isLoading,
    isNewUser,
    error,

    // Derived
    isAuthenticated: !!session,
    isPremium:       profile?.plan === 'explorer' || profile?.plan === 'lifetime',
    isLifetime:      profile?.plan === 'lifetime',
    initials:        profile?.username.slice(0, 2).toUpperCase() ?? '?',

    // Actions
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    sendPasswordReset,
    signOut,
    updateProfile,
    completeProfileSetup,
    clearError,
  };
}
