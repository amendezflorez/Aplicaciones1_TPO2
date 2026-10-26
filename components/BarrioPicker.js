import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../config/theme';
import Button from './Button';

// Selector de barrio: muestra el seleccionado y abre una lista modal.
export default function BarrioPicker({ barrios, selectedId, onSelect, error }) {
  const [visible, setVisible] = useState(false);
  const selected = barrios.find((b) => b.id === selectedId);

  const handleSelect = (barrio) => {
    onSelect(barrio);
    setVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Barrio</Text>
      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setVisible(true)}
      >
        <Text style={selected ? styles.value : styles.placeholder}>
          {selected ? selected.name : 'Elegí tu barrio'}
        </Text>
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={visible} animationType="slide" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <FlatList
            data={barrios}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.option} onPress={() => handleSelect(item)}>
                <Text style={[styles.optionText, item.id === selectedId && styles.optionSelected]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.placeholder}>No hay barrios disponibles.</Text>}
          />
          <View style={styles.footer}>
            <Button title="Cerrar" variant="secondary" onPress={() => setVisible(false)} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 4,
  },
  fieldError: {
    borderColor: colors.error,
  },
  value: {
    fontSize: 16,
    color: colors.text,
  },
  placeholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.error,
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  option: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
  },
  optionText: {
    fontSize: 16,
    color: colors.text,
  },
  optionSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  footer: {
    padding: spacing.md,
  },
});
