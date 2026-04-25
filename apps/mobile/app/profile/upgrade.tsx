import { useStripe } from '@stripe/stripe-react-native';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../stores/authStore';
import { supabase } from '../../lib/supabase';
import { usePlan } from '../../hooks/usePlan';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

interface PlanFeature {
  label: string;
  included: boolean;
}

const FREE_FEATURES: PlanFeature[] = [
  { label: 'Route planning',           included: true  },
  { label: 'GPX export',               included: true  },
  { label: 'Device sync (FIT/Garmin)', included: true  },
  { label: 'Activity recording',       included: true  },
  { label: 'Offline maps',             included: false },
  { label: 'Activity analytics',       included: false },
  { label: 'Ad-free experience',       included: false },
];

const EXPLORER_FEATURES: PlanFeature[] = [
  { label: 'Everything in Free',       included: true },
  { label: 'Offline map downloads',    included: true },
  { label: 'Activity analytics',       included: true },
  { label: 'Ad-free experience',       included: true },
  { label: 'Priority support',         included: true },
];

const LIFETIME_FEATURES: PlanFeature[] = [
  { label: 'Everything in Explorer',   included: true },
  { label: 'All future features',      included: true },
  { label: 'One-time payment, forever',included: true },
];

export default function UpgradeScreen() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { profile, fetchProfile } = useAuthStore();
  const { plan } = usePlan();
  const [loading, setLoading] = useState<'explorer' | 'lifetime' | null>(null);

  const handlePurchase = async (targetPlan: 'explorer' | 'lifetime') => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      Alert.alert('Sign in required', 'Please sign in to upgrade.');
      return;
    }

    setLoading(targetPlan);
    try {
      // 1. Create payment intent via edge function
      const res = await fetch(`${SUPABASE_URL}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: targetPlan }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error ?? 'Failed to start checkout');
      }

      const { paymentIntentClientSecret, customerId, ephemeralKeySecret } = await res.json();

      // 2. Initialise PaymentSheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret,
        customerId,
        customerEphemeralKeySecret: ephemeralKeySecret,
        merchantDisplayName: 'RoamFree',
        allowsDelayedPaymentMethods: false,
        appearance: {
          colors: { primary: '#16a34a' },
        },
      });

      if (initError) throw new Error(initError.message);

      // 3. Present sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        // Canceled is not an error worth showing
        if (paymentError.code !== 'Canceled') {
          Alert.alert('Payment failed', paymentError.message);
        }
        return;
      }

      // 4. Payment succeeded — refresh profile (webhook may take a moment)
      Alert.alert(
        'Payment complete',
        targetPlan === 'lifetime'
          ? 'Welcome to RoamFree Lifetime! Your plan will activate within seconds.'
          : 'Welcome to Explorer! Your plan will activate within seconds.',
        [{ text: 'OK', onPress: () => { fetchProfile(); router.back(); } }],
      );
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Choose a plan',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#16a34a',
          headerShadowVisible: false,
          headerShown: true,
        }}
      />
      <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
        <ScrollView
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#111827' }}>
              Upgrade RoamFree
            </Text>
            <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4, textAlign: 'center' }}>
              GPX export &amp; device sync are always free.{'\n'}
              Upgrade for offline maps and more.
            </Text>
          </View>

          {/* Free Forever */}
          <PlanCard
            title="Free Forever"
            price="$0"
            priceSub="always free"
            accentColor="#6b7280"
            features={FREE_FEATURES}
            isCurrent={plan === 'free'}
            ctaLabel={plan === 'free' ? 'Current plan' : undefined}
            ctaDisabled
          />

          {/* Explorer */}
          <PlanCard
            title="Explorer"
            price="$1.99"
            priceSub="per month"
            accentColor="#16a34a"
            features={EXPLORER_FEATURES}
            isCurrent={plan === 'explorer'}
            badge={plan === 'lifetime' ? undefined : 'Most popular'}
            ctaLabel={
              plan === 'lifetime' ? 'Included in Lifetime' :
              plan === 'explorer' ? 'Current plan' :
              'Start subscription'
            }
            ctaDisabled={plan !== 'free'}
            isLoading={loading === 'explorer'}
            onPress={() => handlePurchase('explorer')}
          />

          {/* Lifetime */}
          <PlanCard
            title="Lifetime"
            price="$29"
            priceSub="one-time payment"
            accentColor="#d97706"
            features={LIFETIME_FEATURES}
            isCurrent={plan === 'lifetime'}
            badge="Best value"
            ctaLabel={plan === 'lifetime' ? 'Current plan' : 'Get lifetime access'}
            ctaDisabled={plan === 'lifetime'}
            isLoading={loading === 'lifetime'}
            onPress={() => handlePurchase('lifetime')}
          />

          {/* Legal note */}
          <Text style={{ color: '#9ca3af', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
            Subscriptions renew monthly. Cancel anytime in your App Store settings.
            Payments processed by Stripe.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

// ─── Plan card ────────────────────────────────────────────────────────────────

interface PlanCardProps {
  title: string;
  price: string;
  priceSub: string;
  accentColor: string;
  features: PlanFeature[];
  isCurrent: boolean;
  badge?: string;
  ctaLabel?: string;
  ctaDisabled?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
}

function PlanCard({
  title, price, priceSub, accentColor, features,
  isCurrent, badge, ctaLabel, ctaDisabled, isLoading, onPress,
}: PlanCardProps) {
  return (
    <View
      style={{
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        borderWidth: isCurrent ? 2 : 1,
        borderColor: isCurrent ? accentColor : '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
      }}
    >
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827' }}>{title}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 }}>
            <Text style={{ fontSize: 24, fontWeight: '800', color: accentColor }}>{price}</Text>
            <Text style={{ fontSize: 12, color: '#9ca3af' }}>{priceSub}</Text>
          </View>
        </View>
        {badge != null && (
          <View style={{ backgroundColor: accentColor, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{badge}</Text>
          </View>
        )}
        {isCurrent && (
          <View style={{ backgroundColor: accentColor + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: accentColor, fontSize: 11, fontWeight: '700' }}>Active</Text>
          </View>
        )}
      </View>

      {/* Feature list */}
      <View style={{ gap: 6, marginBottom: 14 }}>
        {features.map((f) => (
          <View key={f.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, color: f.included ? accentColor : '#d1d5db' }}>
              {f.included ? '✓' : '✗'}
            </Text>
            <Text style={{ fontSize: 13, color: f.included ? '#374151' : '#9ca3af' }}>
              {f.label}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Pressable
        onPress={ctaDisabled ? undefined : onPress}
        disabled={ctaDisabled || isLoading}
        style={{
          backgroundColor: ctaDisabled ? '#f3f4f6' : accentColor,
          borderRadius: 12,
          paddingVertical: 13,
          alignItems: 'center',
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 8,
          opacity: isLoading ? 0.8 : 1,
        }}
      >
        {isLoading && <ActivityIndicator color="#fff" size="small" />}
        <Text
          style={{
            fontWeight: '700',
            fontSize: 15,
            color: ctaDisabled ? '#9ca3af' : '#fff',
          }}
        >
          {ctaLabel}
        </Text>
      </Pressable>
    </View>
  );
}
