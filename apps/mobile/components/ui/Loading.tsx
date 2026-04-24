import { ActivityIndicator, Text, View } from 'react-native';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

export function Loading({ message, fullScreen = false }: LoadingProps) {
  return (
    <View className={['items-center justify-center gap-y-3', fullScreen ? 'flex-1' : 'py-8'].join(' ')}>
      <ActivityIndicator size="large" color="#16a34a" />
      {message && <Text className="text-sm text-gray-500">{message}</Text>}
    </View>
  );
}
