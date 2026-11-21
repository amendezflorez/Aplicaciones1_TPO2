import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../config/theme';

// Pasos de la devolución (Punto 8): Reclamo aceptado -> Punto propuesto -> Punto acordado ->
// Entrega confirmada. `completados` = cuántos pasos ya están hechos (1 a 4); el siguiente
// queda resaltado como paso actual. `detalles` = texto opcional por paso (índice).
export const PASOS_DEVOLUCION = [
  'Reclamo aceptado',
  'Punto propuesto',
  'Punto acordado',
  'Entrega confirmada',
];

export default function TimelineDevolucion({ completados, detalles = {} }) {
  return (
    <View accessibilityRole="list">
      {PASOS_DEVOLUCION.map((paso, index) => {
        const hecho = index < completados;
        const actual = index === completados;
        const ultimo = index === PASOS_DEVOLUCION.length - 1;
        return (
          <View
            key={paso}
            style={styles.row}
            accessibilityLabel={`${paso}${hecho ? ', completado' : actual ? ', paso actual' : ''}`}
          >
            <View style={styles.rail}>
              <View style={[styles.dot, hecho && styles.dotDone, actual && styles.dotCurrent]}>
                {hecho ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                {actual ? <View style={styles.dotInner} /> : null}
              </View>
              {!ultimo ? <View style={[styles.line, hecho && styles.lineDone]} /> : null}
            </View>
            <View style={[styles.texts, !ultimo && styles.textsSpaced]}>
              <Text style={[styles.label, hecho && styles.labelDone, actual && styles.labelCurrent]}>{paso}</Text>
              {detalles[index] ? <Text style={typography.caption}>{detalles[index]}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md - 4 },
  rail: { alignItems: 'center', width: 24 },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotCurrent: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 2 },
  lineDone: { backgroundColor: colors.primary },
  texts: { flex: 1, paddingTop: 2 },
  textsSpaced: { paddingBottom: spacing.md },
  label: { ...typography.bodyStrong, color: colors.textMuted },
  labelDone: { color: colors.text },
  labelCurrent: { color: colors.accent, fontWeight: '800' },
});
