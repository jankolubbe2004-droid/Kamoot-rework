import { Text, View } from 'react-native';
import type { Route } from '../../types';
import { formatDistance, formatElevation } from '../../lib/routing';

interface RouteStatsProps {
  route: Route;
}

export function RouteStats({ route }: RouteStatsProps) {
  return (
    <View className="flex-row bg-gray-50 rounded-2xl p-4 gap-x-2">
      <StatItem icon="📏" label="Distance" value={formatDistance(route.distance_m)} />
      <Divider />
      <StatItem icon="⛰️" label="Elevation" value={formatElevation(route.elevation_gain_m)} />
      <Divider />
      <StatItem icon="🚩" label="Waypoints" value={String(route.waypoints.length)} />
    </View>
  );
}

function StatItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View className="flex-1 items-center gap-y-0.5">
      <Text className="text-xl">{icon}</Text>
      <Text className="text-sm font-semibold text-gray-900">{value}</Text>
      <Text className="text-xs text-gray-500">{label}</Text>
    </View>
  );
}

function Divider() {
  return <View className="w-px bg-gray-200 self-stretch" />;
}
