import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../config/theme';
import BadgeChip from './BadgeChip';

// Meta de la insignia "Vecino solidario" (consigna Punto 2: 5 devoluciones). Mismo umbral
// que UserMapper.SOLIDARIO_MIN_RETURNS del backend; acá solo se usa para la barra de progreso.
const META_SOLIDARIO = 5;

function Stat({ icon, tone, value, label }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.statIcon, { backgroundColor: tone.bg }]}>
        <Ionicons name={icon} size={18} color={tone.fg} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const TONES = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  error: { bg: colors.errorSoft, fg: colors.error },
};

// Tarjeta de reputación (perfil propio y público): puntaje, devoluciones, valoraciones
// positivas/negativas e insignias. esPropio solo cambia la redacción ("tenés" / "tiene").
export default function ReputationSummary({ reputation, badges = [], esPropio = false }) {
  const { returnsCount = 0, positiveCount = 0, negativeCount = 0, score = 0 } = reputation ?? {};
  const faltan = Math.max(META_SOLIDARIO - returnsCount, 0);
  const progreso = Math.min(returnsCount / META_SOLIDARIO, 1);

  return (
    <View style={[styles.container, shadow.sm]}>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Reputación</Text>
          <Text style={styles.caption}>Se construye con devoluciones concretadas y valoraciones.</Text>
        </View>
        <View style={styles.score} accessibilityLabel={`Puntaje: ${score}`}>
          <Ionicons name="star" size={16} color={colors.warning} />
          <Text style={styles.scoreValue}>{score}</Text>
        </View>
      </View>

      <View style={styles.row}>
        <Stat icon="repeat" tone={TONES.primary} value={returnsCount} label="Devoluciones" />
        <View style={styles.divider} />
        <Stat icon="thumbs-up" tone={TONES.success} value={positiveCount} label="Positivas" />
        <View style={styles.divider} />
        <Stat icon="thumbs-down" tone={TONES.error} value={negativeCount} label="Negativas" />
      </View>

      <View style={styles.badgesBox}>
        <Text style={styles.sub}>Insignias</Text>
        {badges.length > 0 ? (
          <View style={styles.badges}>
            {badges.map((badge) => (
              <BadgeChip key={badge.code} label={badge.label} />
            ))}
          </View>
        ) : (
          <View style={styles.progressBox}>
            <Text style={styles.caption}>
              {faltan > 0
                ? `${esPropio ? 'Te' : 'Le'} ${faltan === 1 ? 'falta' : 'faltan'} ${faltan} ${faltan === 1 ? 'devolución' : 'devoluciones'} para la insignia "Vecino solidario".`
                : 'Todavía no hay insignias.'}
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${progreso * 100}%` }]} />
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.heading,
  },
  caption: {
    ...typography.caption,
  },
  score: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.round,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs + 2,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7A4E0C',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  divider: {
    width: 1,
    height: 48,
    backgroundColor: colors.border,
  },
  value: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '800',
    color: colors.text,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badgesBox: {
    gap: spacing.sm,
  },
  sub: {
    ...typography.overline,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  progressBox: {
    gap: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: radius.round,
    backgroundColor: colors.primary,
  },
});
