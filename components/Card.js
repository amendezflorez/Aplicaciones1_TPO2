import { Pressable, StyleSheet, View } from 'react-native';
import { colors, radius, shadow, spacing } from '../config/theme';

// Contenedor base de contenido: fondo blanco sobre el fondo cálido de la app.
// Con onPress se vuelve tocable (feedback de presión incluido).
export default function Card({ children, onPress, style, padded = true, elevated = true, accessibilityLabel }) {
  const base = [styles.card, padded && styles.padded, elevated && shadow.sm, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  padded: {
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
