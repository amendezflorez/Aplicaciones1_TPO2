import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import { colors } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';

export default function BiometricLockScreen() {
  const { completeUnlock, logout } = useAuth();
  const { authenticate } = useBiometrics();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleUnlock = useCallback(async () => {
    setError('');
    setBusy(true);
    const result = await authenticate('Desbloqueá Hallado');
    if (result.success) {
      await completeUnlock();
      return;
    }
    setError(result.message);
    setBusy(false);
  }, [authenticate, completeUnlock]);

  // Lanza el prompt automáticamente al mostrar la pantalla
  useEffect(() => {
    handleUnlock();
  }, [handleUnlock]);

  return (
    <Screen scroll={false} style={styles.center}>
      <Text style={styles.title}>Sesión bloqueada</Text>
      <Text style={styles.subtitle}>Usá tu huella o rostro para continuar.</Text>
      <ErrorText message={error} />
      <Button title="Desbloquear" onPress={handleUnlock} loading={busy} />
      <Button title="Usar contraseña" variant="secondary" onPress={logout} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textMuted,
  },
});
