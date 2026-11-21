import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

// Chip seleccionable (filtros, categorías, rangos) o informativo (sin onPress).
// tone: neutral | primary | accent | success | warning | error | info
const TONES = {
  neutral: { bg: colors.surface, fg: colors.textSecondary },
  primary: { bg: colors.primarySoft, fg: colors.primary },
  accent: { bg: colors.accentSoft, fg: '#B8411F' },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  error: { bg: colors.errorSoft, fg: colors.error },
  info: { bg: colors.infoSoft, fg: colors.info },
};

export default function Chip({ label, selected = false, onPress, icon, tone = 'neutral', size = 'md', style }) {
  const t = TONES[tone] ?? TONES.neutral;
  const small = size === 'sm';
  const bg = selected ? colors.primary : onPress ? colors.card : t.bg;
  const fg = selected ? colors.white : onPress ? colors.text : t.fg;
  const border = selected ? colors.primary : onPress ? colors.border : 'transparent';

  const content = (
    <View style={styles.row}>
      {icon ? <Ionicons name={icon} size={small ? 12 : 15} color={fg} /> : null}
      <Text style={[styles.text, small && styles.textSm, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const base = [styles.chip, small && styles.chipSm, { backgroundColor: bg, borderColor: border }, style];
  if (!onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed }) => [base, pressed && { opacity: 0.8 }]}
      hitSlop={4}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.round,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm - 1,
    alignSelf: 'flex-start',
  },
  chipSm: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 12,
    fontWeight: '700',
  },
});
