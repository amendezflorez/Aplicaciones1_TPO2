import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import HalladoLogo from '../../components/HalladoLogo';
import Screen from '../../components/Screen';
import { InlineMessage } from '../../components/StateViews';
import { colors, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';

export default function BiometricLockScreen() {
  const { completeUnlock, logout } = useAuth();
  const { authenticate } = useBiometrics();
  const [error, setError] = useState('');
  // Arranca ocupado: el prompt se lanza solo al mostrar la pantalla.
  const [busy, setBusy] = useState(true);

  const intentar = useCallback(
    () =>
      authenticate('Desbloqueá Hallado').then(async (result) => {
        if (result.success) {
          await completeUnlock();
          return;
        }
        setError(result.message);
        setBusy(false);
      }),
    [authenticate, completeUnlock]
  );

  // Lanza el prompt automáticamente al mostrar la pantalla
  useEffect(() => {
    intentar();
  }, [intentar]);

  const handleUnlock = () => {
    setError('');
    setBusy(true);
    intentar();
  };

  return (
    <Screen safeTop scroll={false} style={styles.center}>
      <View style={styles.top}>
        <HalladoLogo size={72} />
        <View style={styles.lockCircle}>
          <Ionicons name="finger-print" size={44} color={colors.primary} />
        </View>
        <Text style={styles.title}>Sesión bloqueada</Text>
        <Text style={styles.subtitle}>Usá tu huella o rostro para continuar.</Text>
      </View>
      <InlineMessage tone="error" message={error} />
      <Button title="Desbloquear" icon="finger-print" onPress={handleUnlock} loading={busy} />
      <Button title="Ingresar con contraseña" variant="secondary" onPress={logout} disabled={busy} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    justifyContent: 'center',
    padding: spacing.lg,
  },
  top: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  lockCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  title: {
    ...typography.title,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
