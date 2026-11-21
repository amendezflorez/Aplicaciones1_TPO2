import { USE_MOCK } from '../config/env';

// Modo demo: backend simulado (USE_MOCK) o app en desarrollo (Expo Go / __DEV__). En ese
// modo no se envían emails reales: el código de verificación (OTP) solo aparece en la
// consola del backend (o es 123456 con el servidor simulado). Las pantallas de
// verificación usan este flag para mostrar una ayuda; en una build real no se ve.
export const MODO_DEMO = USE_MOCK || (typeof __DEV__ !== 'undefined' && __DEV__);
