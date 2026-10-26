import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';
import BadgeChip from './BadgeChip';

function Stat({ value, label }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export default function ReputationSummary({ reputation, badges = [] }) {
  const { returnsCount = 0, positiveCount = 0, negativeCount = 0 } = reputation ?? {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reputación</Text>
      <View style={styles.row}>
        <Stat value={returnsCount} label="Devoluciones" />
        <Stat value={positiveCount} label="Positivas" />
        <Stat value={negativeCount} label="Negativas" />
      </View>
      {badges.length > 0 ? (
        <View style={styles.badges}>
          {badges.map((badge) => (
            <BadgeChip key={badge.code} label={badge.label} />
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>Todavía no tiene insignias.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  empty: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
