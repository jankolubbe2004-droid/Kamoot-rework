import { BleManager, Device, State, Characteristic } from 'react-native-ble-plx';
import { Platform } from 'react-native';

// Standard BLE GATT service / characteristic UUIDs
const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

const CYCLING_SPEED_CADENCE_SERVICE = '00001816-0000-1000-8000-00805f9b34fb';
const CSC_MEASUREMENT = '00002a5b-0000-1000-8000-00805f9b34fb';

const CYCLING_POWER_SERVICE = '00001818-0000-1000-8000-00805f9b34fb';
const CYCLING_POWER_MEASUREMENT = '00002a63-0000-1000-8000-00805f9b34fb';

export type SensorType = 'heart_rate' | 'cadence' | 'power';

export interface SensorReading {
  type: SensorType;
  value: number;
  deviceId: string;
  timestamp: number;
}

export interface ConnectedSensor {
  deviceId: string;
  name: string;
  type: SensorType;
  rssi: number | null;
}

type ReadingCallback = (reading: SensorReading) => void;

class SensorManager {
  private manager: BleManager | null = null;
  private connectedDevices = new Map<string, Device>();
  private subscriptions = new Map<string, { remove: () => void }>();
  private readingCallbacks: ReadingCallback[] = [];

  private getManager(): BleManager {
    if (!this.manager) {
      this.manager = new BleManager();
    }
    return this.manager;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const { PermissionsAndroid } = await import('react-native');
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
    }
    return true;
  }

  async waitForBleReady(): Promise<boolean> {
    return new Promise((resolve) => {
      const sub = this.getManager().onStateChange((state) => {
        if (state === State.PoweredOn) {
          sub.remove();
          resolve(true);
        } else if (state === State.PoweredOff || state === State.Unsupported) {
          sub.remove();
          resolve(false);
        }
      }, true);
    });
  }

  scanForSensors(
    onDevice: (device: Device, guessedType: SensorType | null) => void,
    onError?: (error: Error) => void
  ): { stop: () => void } {
    const manager = this.getManager();

    manager.startDeviceScan(
      [HEART_RATE_SERVICE, CYCLING_SPEED_CADENCE_SERVICE, CYCLING_POWER_SERVICE],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          onError?.(error);
          return;
        }
        if (!device) return;

        const type = guessTypeFromServices(device.serviceUUIDs ?? []);
        onDevice(device, type);
      }
    );

    return { stop: () => manager.stopDeviceScan() };
  }

  async connectSensor(device: Device): Promise<ConnectedSensor> {
    const connected = await device.connect();
    await connected.discoverAllServicesAndCharacteristics();

    const services = await connected.services();
    let sensorType: SensorType = 'heart_rate';

    for (const service of services) {
      const uuid = service.uuid.toLowerCase();
      if (uuid === HEART_RATE_SERVICE) { sensorType = 'heart_rate'; break; }
      if (uuid === CYCLING_SPEED_CADENCE_SERVICE) { sensorType = 'cadence'; break; }
      if (uuid === CYCLING_POWER_SERVICE) { sensorType = 'power'; break; }
    }

    this.connectedDevices.set(device.id, connected);
    this.subscribeToNotifications(connected, sensorType);

    return {
      deviceId: device.id,
      name: device.name ?? device.id,
      type: sensorType,
      rssi: device.rssi,
    };
  }

  private subscribeToNotifications(device: Device, type: SensorType) {
    let serviceUUID: string;
    let charUUID: string;

    switch (type) {
      case 'heart_rate':
        serviceUUID = HEART_RATE_SERVICE;
        charUUID = HEART_RATE_MEASUREMENT;
        break;
      case 'cadence':
        serviceUUID = CYCLING_SPEED_CADENCE_SERVICE;
        charUUID = CSC_MEASUREMENT;
        break;
      case 'power':
        serviceUUID = CYCLING_POWER_SERVICE;
        charUUID = CYCLING_POWER_MEASUREMENT;
        break;
    }

    const sub = device.monitorCharacteristicForService(
      serviceUUID,
      charUUID,
      (error, characteristic) => {
        if (error || !characteristic?.value) return;
        const value = parseCharacteristic(type, characteristic);
        if (value == null) return;

        this.readingCallbacks.forEach((cb) =>
          cb({ type, value, deviceId: device.id, timestamp: Date.now() })
        );
      }
    );

    this.subscriptions.set(device.id, sub);
  }

  async disconnectSensor(deviceId: string): Promise<void> {
    this.subscriptions.get(deviceId)?.remove();
    this.subscriptions.delete(deviceId);

    const device = this.connectedDevices.get(deviceId);
    if (device) {
      await device.cancelConnection().catch(() => null);
      this.connectedDevices.delete(deviceId);
    }
  }

  onReading(callback: ReadingCallback): () => void {
    this.readingCallbacks.push(callback);
    return () => {
      this.readingCallbacks = this.readingCallbacks.filter((cb) => cb !== callback);
    };
  }

  async disconnectAll(): Promise<void> {
    for (const id of this.connectedDevices.keys()) {
      await this.disconnectSensor(id);
    }
  }

  destroy() {
    this.disconnectAll();
    this.manager?.destroy();
    this.manager = null;
  }
}

// Parse raw BLE characteristic bytes into a numeric value
function parseCharacteristic(type: SensorType, char: Characteristic): number | null {
  if (!char.value) return null;
  const bytes = Buffer.from(char.value, 'base64');

  switch (type) {
    case 'heart_rate': {
      const flags = bytes[0];
      // Bit 0 of flags: 0 = HR in uint8, 1 = HR in uint16
      return flags & 0x01 ? bytes.readUInt16LE(1) : bytes[1];
    }
    case 'cadence': {
      // Byte 0 flags: bit 1 = crank rev data present
      const flags = bytes[0];
      if (!(flags & 0x02)) return null;
      // Cumulative crank revolutions at bytes 1-2, last event time at bytes 3-4
      return bytes.readUInt16LE(1);
    }
    case 'power': {
      // Instantaneous power: bytes 2-3 (int16, watts)
      return bytes.readInt16LE(2);
    }
    default:
      return null;
  }
}

function guessTypeFromServices(uuids: string[]): SensorType | null {
  const lower = uuids.map((u) => u.toLowerCase());
  if (lower.includes(HEART_RATE_SERVICE)) return 'heart_rate';
  if (lower.includes(CYCLING_POWER_SERVICE)) return 'power';
  if (lower.includes(CYCLING_SPEED_CADENCE_SERVICE)) return 'cadence';
  return null;
}

export const sensorManager = new SensorManager();
