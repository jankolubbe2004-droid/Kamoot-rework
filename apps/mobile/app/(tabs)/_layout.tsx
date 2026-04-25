import { Tabs, router } from 'expo-router';
import { useEffect } from 'react';
import { Text } from 'react-native';
import { useAuthStore } from '../../stores/authStore';

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  const { session, isNewUser } = useAuthStore();

  // Guard: if session disappears (sign-out from another screen) redirect immediately
  useEffect(() => {
    if (!session) {
      router.replace('/auth/login');
    } else if (isNewUser) {
      router.replace('/auth/profile-setup');
    }
  }, [session, isNewUser]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   '#4ade80',
        tabBarInactiveTintColor: '#4b5563',
        tabBarStyle: {
          borderTopColor:   '#1f2937',
          backgroundColor: '#0d1117',
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: 'Plan Route',
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: 'Record',
          tabBarIcon: ({ focused }) => <TabIcon emoji="⏱️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
