import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../config/theme';
import { useConnectivity } from '../hooks/useConnectivity';

// Punto 6 (sección 4.1 del plan): se renderiza una sola vez dentro de <Screen> para
// aparecer automáticamente en todas las pantallas que lo usan, sin que cada una tenga que
// agregarlo a mano. "desconocido" (isInternetReachable todavía null) a propósito NO cuenta
// como sin conexión acá — ver ConnectivityContext.
export default function OfflineBanner() {
  const { sinConexion } = useConnectivity();
  if (!sinConexion) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.texto}>📡 Sin conexión — mostrando información guardada</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  texto: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
