import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

// Botón único de la app. variant: primary | secondary | ghost | danger | accent.
// size: md (48 dp, objetivo táctil recomendado) | sm (36 dp, para acciones en tarjetas).
const VARIANTS = {
  primary: { bg: colors.primary, fg: colors.white, border: colors.primary, pressed: colors.primaryDark },
  accent: { bg: colors.accent, fg: colors.white, border: colors.accent, pressed: '#D9532F' },
  secondary: { bg: colors.card, fg: colors.primary, border: colors.border, pressed: colors.primarySoft },
  ghost: { bg: 'transparent', fg: colors.primary, border: 'transparent', pressed: colors.primarySoft },
  danger: { bg: colors.card, fg: colors.error, border: colors.errorSoft, pressed: colors.errorSoft },
};

export default function Button({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  style,
  accessibilityHint,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary;
  const isDisabled = disabled || loading;
  const small = size === 'sm';
  const iconSize = small ? 16 : 19;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        small ? styles.sm : styles.md,
        { backgroundColor: pressed && !isDisabled ? v.pressed : v.bg, borderColor: v.border },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon ? <Ionicons name={icon} size={iconSize} color={v.fg} /> : null}
          <Text style={[styles.text, small && styles.textSm, { color: v.fg }]} numberOfLines={1}>
            {title}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={iconSize} color={v.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
  },
  sm: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm + 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  textSm: {
    fontSize: 14,
  },
  disabled: {
    opacity: 0.45,
  },
});
