import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, shadow, spacing } from '../config/theme';

// Logotipo de Hallado hecho con formas e Ionicons (sin imágenes): un pin de ubicación
// sobre fondo de marca con una lupa coral (lo que se busca y se encuentra).
// withWordmark muestra además el nombre debajo.
export default function HalladoLogo({ size = 80, withWordmark = false, light = false }) {
  const badge = Math.round(size * 0.38);
  return (
    <View style={styles.wrap} accessibilityRole="image" accessibilityLabel="Hallado">
      <View style={[styles.mark, shadow.md, { width: size, height: size, borderRadius: size * 0.3 }]}>
        <Ionicons name="location" size={size * 0.56} color={colors.white} />
        <View
          style={[
            styles.badge,
            { width: badge, height: badge, borderRadius: badge / 2, right: -badge * 0.25, bottom: -badge * 0.2 },
          ]}
        >
          <Ionicons name="search" size={badge * 0.55} color={colors.white} />
        </View>
      </View>
      {withWordmark ? (
        <Text style={[styles.wordmark, light && { color: colors.white }]}>Hallado</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: spacing.md,
  },
  mark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.primaryDark,
  },
});
