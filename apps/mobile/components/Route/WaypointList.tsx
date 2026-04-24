import { Pressable, ScrollView, Text, View } from 'react-native';
import type { Waypoint } from '../../types';

interface WaypointListProps {
  waypoints: Waypoint[];
  onRemove: (index: number) => void;
  onPress?: (index: number) => void;
}

export function WaypointList({ waypoints, onRemove, onPress }: WaypointListProps) {
  if (waypoints.length === 0) {
    return (
      <View className="py-6 items-center">
        <Text className="text-gray-400 text-sm">
          Long-press on the map to add waypoints
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="max-h-48" showsVerticalScrollIndicator={false}>
      {waypoints.map((wp, index) => (
        <WaypointRow
          key={index}
          waypoint={wp}
          index={index}
          total={waypoints.length}
          onRemove={() => onRemove(index)}
          onPress={() => onPress?.(index)}
        />
      ))}
    </ScrollView>
  );
}

interface WaypointRowProps {
  waypoint: Waypoint;
  index: number;
  total: number;
  onRemove: () => void;
  onPress: () => void;
}

function WaypointRow({ waypoint, index, total, onRemove, onPress }: WaypointRowProps) {
  const isStart = index === 0;
  const isEnd = index === total - 1;
  const dotColor = isStart ? 'bg-brand-600' : isEnd ? 'bg-red-500' : 'bg-gray-400';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-x-3 py-2.5 px-1 active:bg-gray-50 rounded-lg"
    >
      <View className={`w-3 h-3 rounded-full ${dotColor}`} />
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-800">
          {waypoint.title ?? (isStart ? 'Start' : isEnd ? 'End' : `Waypoint ${index}`)}
        </Text>
        <Text className="text-xs text-gray-400">
          {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
        </Text>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={8}
        className="p-1.5 rounded-full active:bg-red-50"
      >
        <Text className="text-gray-400 text-base">✕</Text>
      </Pressable>
    </Pressable>
  );
}
