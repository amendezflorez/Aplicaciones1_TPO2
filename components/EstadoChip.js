import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

// Mismos estados que el enum EstadoPublicacion del backend Java.
const ESTADOS = {
  abierta: { label: 'Abierta', color: colors.success },
  en_reclamo: { label: 'En reclamo', color: colors.accent },
  resuelta: { label: 'Resuelta', color: colors.textMuted },
  vencida: { label: 'Vencida', color: colors.error },
};

export default function EstadoChip({ estado }) {
  const info = ESTADOS[estado] ?? { label: estado, color: colors.textMuted };
  return (
    <View style={[styles.chip, { backgroundColor: info.color }]}>
      <Text style={styles.text}>{info.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.round,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
});
