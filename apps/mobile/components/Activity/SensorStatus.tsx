import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { ConnectedSensor, SensorType } from '../../lib/sensors';

const SENSOR_META: Record<SensorType, { icon: string; label: string; unit: string }> = {
  heart_rate: { icon: '❤️', label: 'Heart Rate', unit: 'bpm' },
  cadence:    { icon: '🔄', label: 'Cadence', unit: 'rpm' },
  power:      { icon: '⚡', label: 'Power', unit: 'W' },
};

interface SensorStatusProps {
  connectedSensors: ConnectedSensor[];
  sensorValues: Partial<Record<SensorType, number>>;
  isScanning?: boolean;
  onScanPress?: () => void;
  onDisconnect?: (deviceId: string) => void;
}

export function SensorStatus({
  connectedSensors,
  sensorValues,
  isScanning = false,
  onScanPress,
  onDisconnect,
}: SensorStatusProps) {
  return (
    <View className="gap-y-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-gray-700">Sensors</Text>
        <Pressable
          onPress={onScanPress}
          disabled={isScanning}
          className="flex-row items-center gap-x-1.5 px-3 py-1 rounded-full bg-brand-50 active:bg-brand-100"
        >
          {isScanning && <ActivityIndicator size="small" color="#16a34a" />}
          <Text className="text-xs font-medium text-brand-700">
            {isScanning ? 'Scanning…' : '+ Add sensor'}
          </Text>
        </Pressable>
      </View>

      {connectedSensors.length === 0 ? (
        <View className="py-3 items-center">
          <Text className="text-xs text-gray-400">No sensors connected</Text>
        </View>
      ) : (
        <View className="gap-y-1.5">
          {connectedSensors.map((sensor) => {
            const meta = SENSOR_META[sensor.type];
            const value = sensorValues[sensor.type];
            return (
              <SensorRow
                key={sensor.deviceId}
                icon={meta.icon}
                label={meta.label}
                deviceName={sensor.name}
                value={value != null ? `${value} ${meta.unit}` : '—'}
                onDisconnect={() => onDisconnect?.(sensor.deviceId)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

function SensorRow({
  icon,
  label,
  deviceName,
  value,
  onDisconnect,
}: {
  icon: string;
  label: string;
  deviceName: string;
  value: string;
  onDisconnect: () => void;
}) {
  return (
    <View className="flex-row items-center gap-x-3 bg-gray-50 rounded-xl px-3 py-2.5">
      <Text className="text-xl">{icon}</Text>
      <View className="flex-1">
        <Text className="text-sm font-medium text-gray-800">{label}</Text>
        <Text className="text-xs text-gray-400">{deviceName}</Text>
      </View>
      <Text className="text-sm font-bold text-brand-700 mr-2">{value}</Text>
      <Pressable
        onPress={onDisconnect}
        hitSlop={8}
        className="p-1 rounded-full active:bg-red-50"
      >
        <Text className="text-gray-400 text-xs">✕</Text>
      </Pressable>
    </View>
  );
}
