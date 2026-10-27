import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '../config/constants';

const isWeb = Platform.OS === 'web';

const tokenStorage = {
  getItem: async (key) => {
    if (isWeb) return AsyncStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key, value) => {
    if (isWeb) return AsyncStorage.setItem(key, value);
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key) => {
    if (isWeb) return AsyncStorage.removeItem(key);
    return SecureStore.deleteItemAsync(key);
  },
};

// Token (dato sensible) -> SecureStore, con fallback a AsyncStorage en web
export const getToken = () => tokenStorage.getItem(STORAGE_KEYS.token);
export const saveToken = (token) => tokenStorage.setItem(STORAGE_KEYS.token, token);
export const deleteToken = () => tokenStorage.removeItem(STORAGE_KEYS.token);

// Preferencias no sensibles -> AsyncStorage
export const getBiometricEnabled = async () =>
  (await AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled)) === 'true';

export const saveBiometricEnabled = (enabled) =>
  enabled
    ? AsyncStorage.setItem(STORAGE_KEYS.biometricEnabled, 'true')
    : AsyncStorage.removeItem(STORAGE_KEYS.biometricEnabled);
