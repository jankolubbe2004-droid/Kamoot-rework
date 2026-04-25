import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { Waypoint } from '../../types';

interface WaypointListProps {
  waypoints: Waypoint[];
  onRemove: (index: number) => void;
  onPress?: (index: number) => void;
  /** Called when the user edits a waypoint label. Pass null to reset to default. */
  onUpdateTitle?: (index: number, title: string | null) => void;
  maxHeight?: number;
}

export function WaypointList({
  waypoints,
  onRemove,
  onPress,
  onUpdateTitle,
  maxHeight = 180,
}: WaypointListProps) {
  if (waypoints.length === 0) {
    return (
      <View className="py-5 items-center">
        <Text className="text-gray-400 text-sm">Tap the map to place your first waypoint</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator={false}>
      {waypoints.map((wp, index) => (
        <WaypointRow
          key={index}
          waypoint={wp}
          index={index}
          total={waypoints.length}
          onRemove={() => onRemove(index)}
          onPress={() => onPress?.(index)}
          onUpdateTitle={onUpdateTitle ? (t) => onUpdateTitle(index, t) : undefined}
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
  onUpdateTitle?: (title: string | null) => void;
}

function WaypointRow({ waypoint, index, total, onRemove, onPress, onUpdateTitle }: WaypointRowProps) {
  const isStart  = index === 0;
  const isEnd    = index === total - 1;
  const dotColor = isStart ? 'bg-brand-600' : isEnd ? 'bg-red-500' : 'bg-gray-400';
  const label    = isStart ? 'Start' : isEnd ? 'End' : `Waypoint ${index}`;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(waypoint.title ?? '');

  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    onUpdateTitle?.(trimmed || null);
  };

  return (
    <View className="flex-row items-center gap-x-2.5 py-2 px-1 rounded-lg">
      <View className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />

      <View className="flex-1">
        {editing ? (
          <TextInput
            className="text-sm font-medium text-gray-800 border-b border-brand-400 pb-0.5"
            value={draft}
            onChangeText={setDraft}
            onBlur={commitEdit}
            onSubmitEditing={commitEdit}
            autoFocus
            returnKeyType="done"
            placeholder={label}
            placeholderTextColor="#9ca3af"
            maxLength={40}
          />
        ) : (
          <Pressable
            onPress={() => {
              if (onUpdateTitle) { setDraft(waypoint.title ?? ''); setEditing(true); }
              else onPress();
            }}
          >
            <Text className="text-sm font-medium text-gray-800" numberOfLines={1}>
              {waypoint.title ?? label}
            </Text>
            <Text className="text-xs text-gray-400">
              {waypoint.lat.toFixed(5)}, {waypoint.lng.toFixed(5)}
            </Text>
          </Pressable>
        )}
      </View>

      <Pressable onPress={onRemove} hitSlop={10} className="p-1.5 rounded-full active:bg-red-50">
        <Text className="text-gray-400 text-sm leading-none">✕</Text>
      </Pressable>
    </View>
  );
}
