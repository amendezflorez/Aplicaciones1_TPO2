import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';

// Indicador de paso de los flujos multi-pantalla (registro 1/3, 2/3, 3/3; recupero 1/2...).
// current es 1-based. Muestra "Paso X de N" y una barra segmentada.
export default function StepIndicator({ current, total, label }) {
  return (
    <View style={styles.wrap} accessibilityLabel={`Paso ${current} de ${total}${label ? `: ${label}` : ''}`}>
      <View style={styles.bars}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.bar, i < current && styles.barDone]} />
        ))}
      </View>
      <Text style={styles.text}>
        Paso {current} de {total}
        {label ? ` · ${label}` : ''}
      </Text>
    </View>
  );
}

// Fila ícono + texto para los avisos chicos debajo de un campo (requisitos de contraseña).
export function Requisito({ ok, text }) {
  return (
    <View style={styles.req}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={16}
        color={ok ? colors.success : colors.textMuted}
      />
      <Text style={[styles.reqText, ok && { color: colors.success }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  bars: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  bar: {
    flex: 1,
    height: 5,
    borderRadius: radius.round,
    backgroundColor: colors.border,
  },
  barDone: {
    backgroundColor: colors.primary,
  },
  text: {
    ...typography.label,
    color: colors.primary,
  },
  req: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  reqText: {
    ...typography.caption,
  },
});
