import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../config/theme';
import { useConnectivity } from '../hooks/useConnectivity';

// Punto 6: se renderiza una sola vez dentro de <Screen>, así aparece en todas las
// pantallas. "desconocido" (isInternetReachable todavía null) NO cuenta como sin conexión.
export default function OfflineBanner() {
  const { sinConexion } = useConnectivity();
  if (!sinConexion) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="cloud-offline" size={16} color={colors.white} />
      <Text style={styles.texto}>Sin conexión. Te mostramos lo último guardado; lo que publiques se envía al volver.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.textSecondary,
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
  },
  texto: {
    flexShrink: 1,
    textAlign: 'center',
    color: colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
});
