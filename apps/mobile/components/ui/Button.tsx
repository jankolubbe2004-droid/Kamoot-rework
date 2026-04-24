import { ActivityIndicator, Pressable, Text } from 'react-native';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, { container: string; text: string }> = {
  primary:   { container: 'bg-brand-600 active:bg-brand-700', text: 'text-white font-semibold' },
  secondary: { container: 'bg-brand-100 active:bg-brand-200', text: 'text-brand-800 font-semibold' },
  danger:    { container: 'bg-red-600 active:bg-red-700', text: 'text-white font-semibold' },
  ghost:     { container: 'bg-transparent active:bg-gray-100', text: 'text-brand-600 font-semibold' },
};

const sizeClasses: Record<Size, { container: string; text: string }> = {
  sm: { container: 'px-3 py-1.5 rounded-lg', text: 'text-sm' },
  md: { container: 'px-4 py-2.5 rounded-xl', text: 'text-base' },
  lg: { container: 'px-6 py-3.5 rounded-xl', text: 'text-lg' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  isDisabled = false,
  fullWidth = false,
}: ButtonProps) {
  const vc = variantClasses[variant];
  const sc = sizeClasses[size];
  const disabled = isDisabled || isLoading;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={[
        'flex-row items-center justify-center',
        vc.container,
        sc.container,
        fullWidth ? 'w-full' : 'self-start',
        disabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {isLoading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? '#fff' : '#16a34a'}
          className="mr-2"
        />
      )}
      <Text className={[vc.text, sc.text].join(' ')}>{label}</Text>
    </Pressable>
  );
}
