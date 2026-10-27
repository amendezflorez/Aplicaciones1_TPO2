import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { colors, radius, spacing } from '../../config/theme';

export default function ClaimsHomeScreen() {
  const navigation = useNavigation();

  return (
    <Screen>
      <Text style={styles.title}>Reclamos y verificación</Text>
      <Text style={styles.subtitle}>
        Gestioná reclamos, confirmaciones y puntos de encuentro desde un solo lugar.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('NewClaim', { publicationId: 'pub-demo-1' })}
      >
        <Text style={styles.primaryButtonText}>Nuevo reclamo</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('MyClaims')}
      >
        <Text style={styles.secondaryButtonText}>Mis reclamos</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
