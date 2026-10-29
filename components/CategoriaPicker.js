import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORIAS } from '../config/constants';
import { colors, radius, spacing } from '../config/theme';

// 6 opciones fijas (sección 1 del plan: enum, no hace falta endpoint). allowEmpty agrega
// un chip "Cualquiera" para dejar la categoría sin filtrar (usado en Resultados al refinar).
export default function CategoriaPicker({ selected, onSelect, allowEmpty = true }) {
  return (
    <View style={styles.wrap}>
      {allowEmpty && <Chip label="Cualquiera" active={!selected} onPress={() => onSelect(null)} />}
      {CATEGORIAS.map((c) => (
        <Chip key={c.id} label={c.label} active={selected === c.id} onPress={() => onSelect(c.id)} />
      ))}
    </View>
  );
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md - 4,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
});
