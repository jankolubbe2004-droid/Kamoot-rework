import { Text, View } from 'react-native';
import type { Difficulty, SportType } from '../../types';

const SPORT_LABELS: Record<SportType, string> = {
  hiking: 'Hiking',
  cycling: 'Cycling',
  trail_running: 'Trail Running',
  mountain_biking: 'MTB',
  walking: 'Walking',
};

const SPORT_COLORS: Record<SportType, string> = {
  hiking:        'bg-green-100 text-green-800',
  cycling:       'bg-blue-100 text-blue-800',
  trail_running: 'bg-orange-100 text-orange-800',
  mountain_biking: 'bg-yellow-100 text-yellow-800',
  walking:       'bg-teal-100 text-teal-800',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  moderate: 'Moderate',
  hard: 'Hard',
  expert: 'Expert',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy:     'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  hard:     'bg-orange-100 text-orange-800',
  expert:   'bg-red-100 text-red-800',
};

export function SportBadge({ sport }: { sport: SportType }) {
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${SPORT_COLORS[sport]}`}>
      <Text className={`text-xs font-medium ${SPORT_COLORS[sport].split(' ')[1]}`}>
        {SPORT_LABELS[sport]}
      </Text>
    </View>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${DIFFICULTY_COLORS[difficulty]}`}>
      <Text className={`text-xs font-medium ${DIFFICULTY_COLORS[difficulty].split(' ')[1]}`}>
        {DIFFICULTY_LABELS[difficulty]}
      </Text>
    </View>
  );
}
