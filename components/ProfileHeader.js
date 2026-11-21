import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../config/theme';
import { formatMemberSince } from '../utils/formatters';
import Avatar from './Avatar';
import Chip from './Chip';

// Cabecera de perfil (propio y público): avatar grande, nombre, barrio y antigüedad.
// children se dibuja debajo (p. ej. el botón "Editar perfil").
export default function ProfileHeader({ photoUrl, name, subtitle, barrio, memberSince, children }) {
  const miembro = formatMemberSince(memberSince);
  return (
    <View style={[styles.card, shadow.sm]}>
      <View style={styles.band} />
      <View style={styles.avatar}>
        <Avatar uri={photoUrl} name={name} size={104} ring />
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {name || 'Completá tu nombre'}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.chips}>
        <Chip icon="location" label={barrio || 'Sin barrio'} tone="primary" />
        {miembro ? <Chip icon="calendar-outline" label={miembro} tone="neutral" /> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg - 4,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  band: {
    alignSelf: 'stretch',
    height: 84,
    marginHorizontal: -spacing.md,
    backgroundColor: colors.primary,
  },
  avatar: {
    marginTop: -52,
  },
  name: {
    ...typography.title,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  subtitle: {
    ...typography.caption,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
