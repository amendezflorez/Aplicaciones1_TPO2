import { StyleSheet, Text, Pressable, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../config/theme';

// Selector segmentado de 2-3 opciones (Mis alertas / Seguidas, Devolví / Recuperé).
// options: [{ id, label, count?, badge? }]
//  - count: cantidad total, se muestra como número suave junto al texto.
//  - badge: novedades pendientes; si es > 0 se muestra un globito de color de acción.
export default function SegmentedTabs({ options, value, onChange, style }) {
  return (
    <View style={[styles.track, style]} accessibilityRole="tablist">
      {options.map((op) => {
        const selected = op.id === value;
        const tieneBadge = op.badge > 0;
        const detalle = [
          op.count != null ? `${op.count} en total` : null,
          tieneBadge ? `${op.badge} novedades` : null,
        ]
          .filter(Boolean)
          .join(', ');
        return (
          <Pressable
            key={op.id}
            onPress={() => onChange(op.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={detalle ? `${op.label}, ${detalle}` : op.label}
            style={[styles.tab, selected && styles.tabSelected, selected && shadow.sm]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {op.label}
            </Text>
            {op.count != null ? (
              <Text style={[styles.count, selected && styles.countSelected]}>{op.count}</Text>
            ) : null}
            {tieneBadge ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{op.badge > 99 ? '99+' : op.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm - 2,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  tabSelected: {
    backgroundColor: colors.card,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelSelected: {
    color: colors.text,
    fontWeight: '700',
  },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  countSelected: {
    color: colors.primary,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: radius.round,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
});
