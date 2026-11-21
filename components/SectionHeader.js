import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../config/theme';

// Título de sección con acción opcional a la derecha ("Ver todo", "Limpiar").
export default function SectionHeader({ title, actionLabel, onAction, style }) {
  return (
    <View style={[styles.row, style]}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  title: {
    ...typography.overline,
  },
  action: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
