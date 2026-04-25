import { Pressable, Text, View } from 'react-native';

interface StarRatingProps {
  value: number;          // 0–5, supports .5 increments
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
  count?: number;         // total rating count to display alongside
}

export function StarRating({
  value,
  max = 5,
  size = 20,
  interactive = false,
  onChange,
  count,
}: StarRatingProps) {
  const stars = Array.from({ length: max }, (_, i) => {
    const full = i + 1 <= value;
    const half = !full && i + 0.5 <= value;
    return full ? 'full' : half ? 'half' : 'empty';
  });

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      {stars.map((type, i) => (
        <Pressable
          key={i}
          disabled={!interactive}
          onPress={() => onChange?.(i + 1)}
          style={{ padding: 1 }}
        >
          <Text style={{ fontSize: size, lineHeight: size + 4 }}>
            {type === 'full' ? '★' : type === 'half' ? '⯨' : '☆'}
          </Text>
        </Pressable>
      ))}
      {count != null && (
        <Text style={{ fontSize: size * 0.65, color: '#6b7280', marginLeft: 4 }}>
          ({count})
        </Text>
      )}
    </View>
  );
}

interface RatingBreakdownProps {
  average: number;
  count: number;
  distribution?: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function RatingBreakdown({ average, count, distribution }: RatingBreakdownProps) {
  return (
    <View className="gap-y-2">
      <View className="flex-row items-center gap-x-3">
        <Text className="text-4xl font-bold text-gray-900">{average.toFixed(1)}</Text>
        <View className="gap-y-0.5">
          <StarRating value={average} size={16} />
          <Text className="text-xs text-gray-400">{count} rating{count !== 1 ? 's' : ''}</Text>
        </View>
      </View>

      {distribution && (
        <View className="gap-y-1">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const n = distribution[star] ?? 0;
            const pct = count > 0 ? (n / count) * 100 : 0;
            return (
              <View key={star} className="flex-row items-center gap-x-2">
                <Text className="text-xs text-gray-500 w-2">{star}</Text>
                <Text className="text-xs">★</Text>
                <View className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </View>
                <Text className="text-xs text-gray-400 w-6 text-right">{n}</Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
