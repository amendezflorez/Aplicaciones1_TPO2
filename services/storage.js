import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../config/constants';

// Token (dato sensible) -> SecureStore. SecureStore no existe en web: ahí (solo para
// previsualizar la UI en el navegador con el mock) cae a AsyncStorage. En Android siempre
// se usa SecureStore.
const esWeb = Platform.OS === 'web';
export const getToken = () =>
  esWeb ? AsyncStorage.getItem(STORAGE_KEYS.token) : SecureStore.getItemAsync(STORAGE_KEYS.token);
export const saveToken = (token) =>
  esWeb ? AsyncStorage.setItem(STORAGE_KEYS.token, token) : SecureStore.setItemAsync(STORAGE_KEYS.token, token);
export const deleteToken = () =>
  esWeb ? AsyncStorage.removeItem(STORAGE_KEYS.token) : SecureStore.deleteItemAsync(STORAGE_KEYS.token);

// Preferencias no sensibles -> AsyncStorage
export const getBiometricEnabled = async () =>
  (await AsyncStorage.getItem(STORAGE_KEYS.biometricEnabled)) === 'true';

export const saveBiometricEnabled = (enabled) =>
  enabled
    ? AsyncStorage.setItem(STORAGE_KEYS.biometricEnabled, 'true')
    : AsyncStorage.removeItem(STORAGE_KEYS.biometricEnabled);
