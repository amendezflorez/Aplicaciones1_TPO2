import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

const statusColors = {
  pendiente: '#F59E0B',
  aceptado: '#16A34A',
  rechazado: '#DC2626',
  vencido: '#64748B',
};

export default function ClaimCard({ claim, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {claim.type === 'is_mine' ? 'Es mío' : 'Lo encontré'}
        </Text>
        <View style={[styles.badge, { backgroundColor: `${statusColors[claim.status]}22` }]}> 
          <Text style={[styles.badgeText, { color: statusColors[claim.status] }]}>
            {claim.status}
          </Text>
        </View>
      </View>

      <Text style={styles.meta}>{claim.barrio || 'Sin barrio'}</Text>
      <Text style={styles.description} numberOfLines={2}>
        {claim.description || claim.verificationAnswer || 'Sin descripción'}
      </Text>
      <Text style={styles.footer}>Publicación: {claim.publicationId}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.round,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  meta: {
    color: colors.primaryDark,
    marginBottom: 4,
    fontWeight: '600',
  },
  description: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  footer: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
  },
});
