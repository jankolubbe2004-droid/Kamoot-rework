import { useAuthStore } from '../stores/authStore';
import type { UserPlan } from '../types';

// Features gated behind Explorer/Lifetime.
// GPX export and device sync are intentionally NOT in this list — always free.
export type PremiumFeature = 'offline_maps' | 'analytics' | 'no_ads';

interface UsePlanReturn {
  plan: UserPlan;
  isPremium: boolean;
  isExplorer: boolean;
  isLifetime: boolean;
  canAccess: (feature: PremiumFeature) => boolean;
}

export function usePlan(): UsePlanReturn {
  const profile = useAuthStore((s) => s.profile);
  const plan: UserPlan = profile?.plan ?? 'free';
  const isPremium = plan === 'explorer' || plan === 'lifetime';

  return {
    plan,
    isPremium,
    isExplorer: plan === 'explorer',
    isLifetime: plan === 'lifetime',
    canAccess: (_feature: PremiumFeature) => isPremium,
  };
}
