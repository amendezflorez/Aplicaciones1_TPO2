import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../config/theme';
import OfflineBanner from './OfflineBanner';

// Contenedor de toda pantalla.
// - title/subtitle: encabezado grande opcional dentro del contenido (para tabs sin header).
// - footer: zona fija abajo (botón principal de un formulario o wizard).
// - onRefresh/refreshing: pull-to-refresh.
// - safeTop: true solo si la pantalla oculta el header del stack (headerShown: false);
//   con header, el propio header ya respeta el notch.
export default function Screen({
  children,
  scroll = true,
  style,
  title,
  subtitle,
  footer,
  onRefresh,
  refreshing = false,
  safeTop = false,
}) {
  const header = title ? (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  ) : null;

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        ) : undefined
      }
    >
      {header}
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fill, style]}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={safeTop ? ['top'] : []}>
      {/* Punto 6: visible en toda pantalla que use <Screen>. */}
      <OfflineBanner />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {content}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  fill: {
    flex: 1,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.display,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
});
