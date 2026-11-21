import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../config/theme';

// Fila de menú tocable (perfil, configuración): ícono en caja, título, subtítulo opcional
// y flecha. Se apila dentro de un <Card padded={false}>; separator dibuja la línea inferior.
export default function MenuRow({ icon, title, subtitle, onPress, separator = true, tone = 'primary' }) {
  const fg = tone === 'danger' ? colors.error : colors.primary;
  const bg = tone === 'danger' ? colors.errorSoft : colors.primarySoft;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.row, separator && styles.separator, pressed && { backgroundColor: colors.background }]}
    >
      <View style={[styles.icon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={fg} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, tone === 'danger' && { color: colors.error }]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    minHeight: 60,
  },
  separator: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  title: {
    ...typography.bodyStrong,
  },
  subtitle: {
    ...typography.caption,
  },
});
