import { Text, TextInput, View, type TextInputProps } from 'react-native';

interface InputProps extends TextInputProps {
  label?:      string
  error?:      string
  hint?:       string
  dark?:       boolean   // true → dark-theme label + error colors
  className?:  string
}

export function Input({ label, error, hint, dark = false, className, ...props }: InputProps) {
  const labelColor = dark ? 'text-gray-300' : 'text-gray-700';
  const errorColor = dark ? 'text-red-400'  : 'text-red-500';
  const hintColor  = dark ? 'text-gray-600' : 'text-gray-400';

  // Base input classes — caller can override via className (e.g. bg-gray-900 border-gray-700)
  const baseInput = [
    'border rounded-xl px-4 py-3 text-base',
    dark
      ? 'bg-gray-900 border-gray-700 text-white'
      : 'bg-white border-gray-300 text-gray-900',
    error
      ? (dark ? 'border-red-700' : 'border-red-400')
      : '',
    className ?? '',
  ].join(' ');

  return (
    <View className="gap-y-1">
      {label && (
        <Text className={`text-sm font-medium ${labelColor}`}>{label}</Text>
      )}
      <TextInput
        className={baseInput}
        placeholderTextColor={dark ? '#4b5563' : '#9ca3af'}
        {...props}
      />
      {error        && <Text className={`text-xs ${errorColor}`}>{error}</Text>}
      {!error && hint && <Text className={`text-xs ${hintColor}`}>{hint}</Text>}
    </View>
  );
}
