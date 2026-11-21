import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';

// "Perdido" / "Encontrado": distingue de un vistazo el tipo de publicación.
// Acepta los valores de la API ('perdido' | 'encontrado').
export default function TipoBadge({ tipo, solid = false, style }) {
  const perdido = tipo === 'perdido';
  const color = perdido ? colors.perdido : colors.encontrado;
  const soft = perdido ? colors.perdidoSoft : colors.encontradoSoft;
  return (
    <View style={[styles.badge, { backgroundColor: solid ? color : soft }, style]}>
      <Ionicons name={perdido ? 'help-circle' : 'hand-left'} size={12} color={solid ? colors.white : color} />
      <Text style={[styles.text, { color: solid ? colors.white : color }]}>{perdido ? 'Perdido' : 'Encontrado'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.round,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
