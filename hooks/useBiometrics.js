import { useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

const ERROR_MESSAGES = {
  user_cancel: 'Cancelaste la autenticación.',
  system_cancel: 'El sistema interrumpió la autenticación. Intentá de nuevo.',
  app_cancel: 'La autenticación fue cancelada.',
  lockout: 'Demasiados intentos fallidos. Esperá un momento o usá tu contraseña.',
  not_enrolled: 'No hay huella ni rostro registrados en el dispositivo.',
  not_available: 'La biometría no está disponible en este dispositivo.',
  authentication_failed: 'No se pudo reconocer tu identidad. Intentá de nuevo.',
};

export const getBiometricErrorMessage = (error) =>
  ERROR_MESSAGES[error] ?? 'No se pudo autenticar. Intentá de nuevo.';

export function useBiometrics() {
  // Siempre verificar hardware + enrolamiento antes de lanzar el prompt.
  const checkAvailability = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return { hasHardware, isEnrolled, types, available: hasHardware && isEnrolled };
  }, []);

  // Devuelve { success: true } o { success: false, error, message }.
  const authenticate = useCallback(
    async (promptMessage = 'Autenticá tu identidad') => {
      const { available } = await checkAvailability();
      if (!available) {
        return {
          success: false,
          error: 'not_available',
          message: getBiometricErrorMessage('not_available'),
        };
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });
      if (result.success) return { success: true };
      return {
        success: false,
        error: result.error,
        message: getBiometricErrorMessage(result.error),
      };
    },
    [checkAvailability]
  );

  return { checkAvailability, authenticate };
}
