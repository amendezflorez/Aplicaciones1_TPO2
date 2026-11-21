import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIAS } from '../config/constants';
import { colors, radius, shadow, spacing, typography } from '../config/theme';
import Chip from './Chip';

// Ícono (Ionicons) de cada categoría. Se exporta para reusarlo en otras pantallas.
export const ICONOS_CATEGORIA = {
  documentos: 'document-text-outline',
  llaves: 'key-outline',
  electronica: 'phone-portrait-outline',
  mascotas: 'paw-outline',
  ropa: 'shirt-outline',
  otros: 'cube-outline',
};

// 6 opciones fijas (enum en el backend, no hace falta endpoint). Por defecto es una grilla
// de tarjetas con ícono (buscador y publicar). `compact` la muestra como chips, para
// espacios chicos como la hoja "Refinar". allowEmpty agrega "Cualquiera" para dejar la
// categoría sin filtrar; tocar la categoría ya elegida también la deselecciona.
export default function CategoriaPicker({ selected, onSelect, allowEmpty = true, compact = false }) {
  if (compact) {
    return (
      <View style={styles.chips}>
        {allowEmpty ? <Chip label="Cualquiera" selected={!selected} onPress={() => onSelect(null)} /> : null}
        {CATEGORIAS.map((c) => (
          <Chip
            key={c.id}
            label={c.label}
            icon={ICONOS_CATEGORIA[c.id]}
            selected={selected === c.id}
            onPress={() => onSelect(c.id)}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {allowEmpty ? (
        <Tarjeta
          icon="apps-outline"
          label="Cualquier categoría"
          active={!selected}
          onPress={() => onSelect(null)}
          ancha
        />
      ) : null}
      {CATEGORIAS.map((c) => (
        <Tarjeta
          key={c.id}
          icon={ICONOS_CATEGORIA[c.id] ?? 'cube-outline'}
          label={c.label}
          active={selected === c.id}
          onPress={() => onSelect(allowEmpty && selected === c.id ? null : c.id)}
        />
      ))}
    </View>
  );
}

function Tarjeta({ icon, label, active, onPress, ancha }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.tarjeta,
        ancha && styles.tarjetaAncha,
        active && styles.tarjetaActiva,
        pressed && { opacity: 0.85 },
      ]}
    >
      <View style={[styles.icono, active && styles.iconoActivo]}>
        <Ionicons name={icon} size={22} color={active ? colors.white : colors.primary} />
      </View>
      <Text style={[styles.label, active && styles.labelActivo]} numberOfLines={1}>
        {label}
      </Text>
      {active ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.check} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tarjeta: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: 64,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.sm,
  },
  tarjetaAncha: {
    width: '100%',
  },
  tarjetaActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActivo: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.bodyStrong,
    flex: 1,
  },
  labelActivo: {
    color: colors.primaryDark,
  },
  check: {
    marginLeft: 'auto',
  },
});
