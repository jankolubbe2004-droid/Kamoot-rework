import { Text, View } from 'react-native';
import { formatDistance, formatDuration, formatElevation } from '../../lib/routing';

export interface LiveStats {
  elapsedMs: number;
  distanceM: number;
  elevationGainM: number;
  heartRate: number | null;
  cadence: number | null;
  power: number | null;
  currentPaceSecPerKm: number | null;
}

interface ActivityStatsProps {
  stats: LiveStats;
  compact?: boolean;
}

export function ActivityStats({ stats, compact = false }: ActivityStatsProps) {
  if (compact) {
    return (
      <View className="flex-row justify-around">
        <StatCell label="Time" value={formatDuration(stats.elapsedMs)} />
        <StatCell label="Dist" value={formatDistance(stats.distanceM)} />
        {stats.heartRate != null && <StatCell label="HR" value={`${stats.heartRate} bpm`} />}
      </View>
    );
  }

  return (
    <View className="gap-y-3">
      {/* Primary stats */}
      <View className="flex-row justify-around">
        <StatCell label="Duration" value={formatDuration(stats.elapsedMs)} large />
        <Divider />
        <StatCell label="Distance" value={formatDistance(stats.distanceM)} large />
      </View>

      {/* Secondary stats */}
      <View className="flex-row justify-around border-t border-gray-100 pt-3">
        <StatCell label="Elevation" value={formatElevation(stats.elevationGainM)} />
        <StatCell
          label="Pace"
          value={stats.currentPaceSecPerKm != null ? formatPace(stats.currentPaceSecPerKm) : '—'}
        />
        {stats.heartRate != null && (
          <StatCell label="Heart rate" value={`${stats.heartRate} bpm`} accent="text-red-500" />
        )}
        {stats.cadence != null && (
          <StatCell label="Cadence" value={`${stats.cadence} rpm`} accent="text-blue-500" />
        )}
        {stats.power != null && (
          <StatCell label="Power" value={`${stats.power} W`} accent="text-yellow-600" />
        )}
      </View>
    </View>
  );
}

function StatCell({
  label,
  value,
  large,
  accent,
}: {
  label: string;
  value: string;
  large?: boolean;
  accent?: string;
}) {
  return (
    <View className="items-center flex-1">
      <Text className={[large ? 'text-2xl' : 'text-base', 'font-bold', accent ?? 'text-gray-900'].join(' ')}>
        {value}
      </Text>
      <Text className="text-xs text-gray-500 mt-0.5">{label}</Text>
    </View>
  );
}

function Divider() {
  return <View className="w-px bg-gray-200 self-stretch" />;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')} /km`;
}
