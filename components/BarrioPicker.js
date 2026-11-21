import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../config/theme';
import { useConnectivity } from '../hooks/useConnectivity';
import TextField from './TextField';

// Normaliza para buscar sin importar tildes ni mayúsculas ("belgrano" encuentra "Belgrano").
export const normalizarTexto = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export function filtrarBarrios(barrios, consulta) {
  const q = normalizarTexto(consulta);
  if (!q) return barrios;
  return barrios.filter((b) => normalizarTexto(b.name).includes(q));
}

// Selector de barrio: muestra el seleccionado y abre una lista modal con buscador.
export default function BarrioPicker({
  barrios,
  selectedId,
  onSelect,
  error,
  label = 'Barrio',
  placeholder = 'Elegí tu barrio',
}) {
  const [visible, setVisible] = useState(false);
  const [consulta, setConsulta] = useState('');
  const { sinConexion } = useConnectivity();
  const selected = barrios.find((b) => b.id === selectedId);
  // Lista vacía sin conexión = nunca se cargó con red (getBarrios ya cae al caché si lo
  // hay, ver services/userService.js).
  const sinListaOffline = barrios.length === 0 && sinConexion;
  const visibles = useMemo(() => filtrarBarrios(barrios, consulta), [barrios, consulta]);

  const cerrar = () => {
    setVisible(false);
    setConsulta('');
  };

  const handleSelect = (barrio) => {
    onSelect(barrio);
    cerrar();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setVisible(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected ? selected.name : placeholder}`}
      >
        <Ionicons name="location-outline" size={20} color={selected ? colors.primary : colors.textMuted} />
        <Text style={[styles.fieldText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.name : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>
      {sinListaOffline ? (
        <Text style={styles.aviso}>Necesitás conexión al menos una vez para cargar los barrios.</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitulo}>{placeholder}</Text>
            <Pressable
              onPress={cerrar}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={styles.cerrar}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.buscador}>
            <TextField
              icon="search"
              placeholder="Buscar barrio"
              value={consulta}
              onChangeText={setConsulta}
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>
          <FlatList
            data={visibles}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => <FilaBarrio barrio={item} activo={item.id === selectedId} onPress={handleSelect} />}
            ListEmptyComponent={
              <Text style={[styles.placeholder, styles.vacio]}>
                {sinListaOffline
                  ? 'Necesitás conexión al menos una vez para cargar los barrios.'
                  : consulta
                    ? `No encontramos barrios que coincidan con "${consulta}".`
                    : 'No hay barrios disponibles.'}
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// Fila tocable de un barrio, usada por el modal y por la lista en línea del buscador.
export function FilaBarrio({ barrio, activo, onPress }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.fila, activo && styles.filaActiva, pressed && { opacity: 0.8 }]}
      onPress={() => onPress(barrio)}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={barrio.name}
    >
      <Ionicons name="location-outline" size={18} color={activo ? colors.primary : colors.textMuted} />
      <Text style={[styles.filaTexto, activo && styles.filaTextoActiva]}>{barrio.name}</Text>
      {activo ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  label: {
    ...typography.label,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card,
  },
  fieldError: {
    borderColor: colors.error,
  },
  fieldText: {
    flex: 1,
    ...typography.body,
  },
  placeholder: {
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.error,
  },
  aviso: {
    ...typography.caption,
  },
  vacio: {
    padding: spacing.lg,
    textAlign: 'center',
    ...typography.body,
    color: colors.textMuted,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  modalTitulo: {
    ...typography.title,
  },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buscador: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filaActiva: {
    backgroundColor: colors.primarySoft,
  },
  filaTexto: {
    flex: 1,
    ...typography.body,
  },
  filaTextoActiva: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
});
