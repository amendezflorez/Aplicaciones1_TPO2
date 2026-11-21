import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

// Insignia del perfil (p. ej. "Vecino solidario", Punto 2).
export default function BadgeChip({ label }) {
  return (
    <View style={styles.chip} accessibilityLabel={`Insignia: ${label}`}>
      <View style={styles.medal}>
        <Ionicons name="ribbon" size={16} color={colors.white} />
      </View>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.round,
    paddingVertical: 5,
    paddingLeft: 5,
    paddingRight: spacing.md,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#7A4E0C',
    fontWeight: '700',
    fontSize: 14,
  },
});
