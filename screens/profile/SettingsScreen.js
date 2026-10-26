import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import { colors, spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useBiometrics } from '../../hooks/useBiometrics';

export default function SettingsScreen() {
  const { biometricEnabled, setBiometricEnabled } = useAuth();
  const { checkAvailability, authenticate } = useBiometrics();
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAvailability()
      .then((result) => setAvailable(result.available))
      .finally(() => setChecking(false));
  }, [checkAvailability]);

  const handleToggle = async (value) => {
    if (!value) {
      await setBiometricEnabled(false);
      return;
    }
    // Confirmar con el prompt antes de activar
    const result = await authenticate('Confirmá tu identidad para activar el desbloqueo');
    if (result.success) {
      await setBiometricEnabled(true);
    } else if (result.error !== 'user_cancel') {
      Alert.alert('No se pudo activar', result.message);
    }
  };

  const disabled = checking || !available;

  return (
    <Screen>
      <View style={styles.row}>
        <View style={styles.rowText}>
          <Text style={styles.label}>Desbloqueo con biometría</Text>
          <Text style={styles.hint}>
            {disabled && !checking
              ? 'Tu dispositivo no tiene huella o rostro configurados.'
              : 'Pedir huella o rostro al abrir la app.'}
          </Text>
        </View>
        <Switch value={biometricEnabled} onValueChange={handleToggle} disabled={disabled} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
