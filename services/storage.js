import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../config/constants';

// Token (dato sensible) -> SecureStore
export const getToken = () => SecureStore.getItemAsync(STORAGE_KEYS.token);
export const saveToken = (token) => SecureStore.setItemAsync(STORAGE_KEYS.token, token);
export const deleteToken = () => SecureStore.deleteItemAsync(STORAGE_KEYS.token);

// Preferencias no sensibles -> AsyncStorage
export const getBiometricEnabled = async () =>
  (await AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled)) === 'true';

export const saveBiometricEnabled = (enabled) =>
  enabled
    ? AsyncStorage.setItem(STORAGE_KEYS.biometricEnabled, 'true')
    : AsyncStorage.removeItem(STORAGE_KEYS.biometricEnabled);
