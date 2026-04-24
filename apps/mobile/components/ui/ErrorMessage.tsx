import { Text, View } from 'react-native';
import { Button } from './Button';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View className="items-center justify-center py-8 px-6 gap-y-3">
      <Text className="text-4xl">⚠️</Text>
      <Text className="text-base text-gray-700 text-center">{message}</Text>
      {onRetry && <Button label="Try again" onPress={onRetry} variant="secondary" />}
    </View>
  );
}
