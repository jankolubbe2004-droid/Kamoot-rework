import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <View className="gap-y-1">
      {label && (
        <Text className="text-sm font-medium text-gray-700">{label}</Text>
      )}
      <TextInput
        className={[
          'border rounded-xl px-4 py-3 text-base text-gray-900 bg-white',
          error ? 'border-red-400' : 'border-gray-300',
          'focus:border-brand-500',
          className ?? '',
        ].join(' ')}
        placeholderTextColor="#9ca3af"
        {...props}
      />
      {error && <Text className="text-xs text-red-500">{error}</Text>}
      {!error && hint && <Text className="text-xs text-gray-400">{hint}</Text>}
    </View>
  );
}
