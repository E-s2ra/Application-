import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEVICE_ID_KEY = 'device-session-id-v1';

/**
 * Creates one random identifier per installed app. It is not a hardware ID and
 * intentionally changes after the app's protected storage is cleared.
 */
export async function getDeviceId(): Promise<string> {
  if (Platform.OS === 'web') {
    const existingId = localStorage.getItem(DEVICE_ID_KEY);
    if (existingId) return existingId;

    const deviceId = Crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  const existingId = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existingId) return existingId;

  const deviceId = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
