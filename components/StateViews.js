import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';
import Button from './Button';

// Estados de pantalla compartidos: vacío, error con reintento y esqueleto de carga.
// Regla: una pantalla muestra UNO solo de estos a la vez (nunca "error" + "vacío" juntos).

export function EmptyState({ icon = 'search', title, message, actionLabel, onAction, secondaryLabel, onSecondary, style }) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="summary">
      <View style={[styles.iconCircle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={34} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel ? <Button title={actionLabel} onPress={onAction} style={styles.action} /> : null}
      {secondaryLabel ? (
        <Button title={secondaryLabel} onPress={onSecondary} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

export function ErrorState({ title = 'No pudimos cargar esto', message, onRetry, retrying = false, style }) {
  return (
    <View style={[styles.wrap, style]} accessibilityRole="alert">
      <View style={[styles.iconCircle, { backgroundColor: colors.errorSoft }]}>
        <Ionicons name="cloud-offline-outline" size={34} color={colors.error} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {onRetry ? (
        <Button title="Reintentar" icon="refresh" onPress={onRetry} loading={retrying} variant="secondary" style={styles.action} />
      ) : null}
    </View>
  );
}

// Aviso en línea (dentro de un formulario o una tarjeta). tone: error | warning | info | success
const BANNER = {
  error: { bg: colors.errorSoft, fg: colors.error, icon: 'alert-circle' },
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'warning' },
  info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle' },
  success: { bg: colors.successSoft, fg: colors.success, icon: 'checkmark-circle' },
};

export function InlineMessage({ tone = 'error', message, style }) {
  if (!message) return null;
  const t = BANNER[tone] ?? BANNER.error;
  return (
    <View style={[styles.inline, { backgroundColor: t.bg }, style]} accessibilityRole="alert">
      <Ionicons name={t.icon} size={18} color={t.fg} />
      <Text style={[styles.inlineText, { color: t.fg }]}>{message}</Text>
    </View>
  );
}

export function Skeleton({ width = '100%', height = 14, radius: r = radius.sm, style }) {
  const [opacity] = useState(() => new Animated.Value(0.5));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: colors.surface, opacity }, style]} />;
}

// Esqueleto con la forma de una PublicationCard: se muestra mientras carga una lista.
export function CardSkeleton({ count = 3 }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.skelCard}>
          <Skeleton width={96} height={96} radius={radius.md} />
          <View style={{ flex: 1, gap: spacing.sm, paddingVertical: spacing.xs }}>
            <Skeleton width="40%" height={12} />
            <Skeleton width="85%" height={16} />
            <Skeleton width="60%" height={12} />
            <Skeleton width="50%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.heading,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md - 4,
    borderRadius: radius.md,
  },
  inlineText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  skelCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
