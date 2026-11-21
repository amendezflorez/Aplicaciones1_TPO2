import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { InlineMessage } from '../../components/StateViews';
import { colors, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';
import { useToast } from '../../hooks/useToast';

export default function SettingsScreen() {
  const { biometricEnabled, setBiometricEnabled, logout, user } = useAuth();
  const { checkAvailability, authenticate } = useBiometrics();
  const toast = useToast();
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    checkAvailability()
      .then((result) => setAvailable(result.available))
      .catch(() => setAvailable(false))
      .finally(() => setChecking(false));
  }, [checkAvailability]);

  const handleToggle = async (value) => {
    setBusy(true);
    try {
      if (!value) {
        await setBiometricEnabled(false);
        toast.info('Desbloqueo con biometría desactivado.');
        return;
      }
      // Confirmar con el prompt antes de activar
      const result = await authenticate('Confirmá tu identidad para activar el desbloqueo');
      if (result.success) {
        await setBiometricEnabled(true);
        toast.success('Desbloqueo con biometría activado.');
      } else if (result.error !== 'user_cancel') {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const confirmarLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  const sinBiometria = !checking && !available;

  return (
    <Screen>
      <SectionHeader title="Seguridad" />
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconBox}>
            <Ionicons name="finger-print" size={24} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.label}>Desbloqueo con biometría</Text>
            <Text style={styles.hint}>
              Al abrir Hallado te pedimos tu huella o rostro, sin tener que escribir la contraseña.
            </Text>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={handleToggle}
            disabled={checking || !available || busy}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            accessibilityLabel="Desbloqueo con biometría"
          />
        </View>
        <Text style={styles.detail}>
          Tu sesión sigue iniciada en este dispositivo; la biometría solo protege el acceso a la app. Si falla,
          podés ingresar con tu contraseña.
        </Text>
      </Card>
      {sinBiometria ? (
        <InlineMessage
          tone="warning"
          message="Tu dispositivo no tiene huella o rostro configurados. Configuralos en los ajustes del teléfono para poder activar esta opción."
        />
      ) : null}

      <SectionHeader title="Cuenta" />
      <Card style={styles.card}>
        {user?.email ? (
          <Text style={styles.hint}>
            Sesión iniciada como <Text style={styles.strong}>{user.email}</Text>
          </Text>
        ) : null}
        <Button title="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={confirmarLogout} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    ...typography.subheading,
  },
  hint: {
    ...typography.caption,
  },
  strong: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    ...typography.caption,
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: spacing.sm + 2,
  },
});
