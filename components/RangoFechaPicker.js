import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RANGOS_FECHA } from '../config/constants';
import { colors, radius, spacing } from '../config/theme';

// @react-native-community/datetimepicker no tiene modo "range" (confirmado contra la doc
// de Expo SDK 57, que remite al README de la librería): "personalizado" muestra dos
// pickers, desde y hasta, tal como preveía la sección 4.1 del plan para ese caso.
// display="default": en Android abre como diálogo nativo; en iOS (14+) muestra un botón
// compacto que abre un calendario.
// onChange (event, date) está deprecado desde la 9.x instalada (confirmado contra
// src/index.d.ts del paquete, no de memoria) a favor de onValueChange (se llama solo
// cuando la persona confirma un valor) + onDismiss (se llama al cerrar sin elegir nada) —
// onChange mezclaba los dos casos en un solo callback distinguido por event.type.
export default function RangoFechaPicker({ rango, onSelectRango, desde, hasta, onChangeDesde, onChangeHasta }) {
  const [mostrando, setMostrando] = useState(null); // 'desde' | 'hasta' | null

  const handleValueChange = (onChange) => (event, selectedDate) => {
    setMostrando(null);
    onChange(selectedDate);
  };
  const handleDismiss = () => setMostrando(null);

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {RANGOS_FECHA.map((r) => (
          <TouchableOpacity
            key={r.id}
            style={[styles.chip, rango === r.id && styles.chipActive]}
            onPress={() => onSelectRango(r.id)}
          >
            <Text style={[styles.chipText, rango === r.id && styles.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {rango === 'personalizado' ? (
        <View style={styles.fechas}>
          <TouchableOpacity style={styles.fechaField} onPress={() => setMostrando('desde')}>
            <Text style={styles.fechaLabel}>Desde</Text>
            <Text style={styles.fechaValue}>{desde ? desde.toLocaleDateString() : 'Elegir'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fechaField} onPress={() => setMostrando('hasta')}>
            <Text style={styles.fechaLabel}>Hasta</Text>
            <Text style={styles.fechaValue}>{hasta ? hasta.toLocaleDateString() : 'Elegir'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {mostrando === 'desde' ? (
        <DateTimePicker
          value={desde ?? new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onValueChange={handleValueChange(onChangeDesde)}
          onDismiss={handleDismiss}
        />
      ) : null}
      {mostrando === 'hasta' ? (
        <DateTimePicker
          value={hasta ?? new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onValueChange={handleValueChange(onChangeHasta)}
          onDismiss={handleDismiss}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chips: {
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
  fechas: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fechaField: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  fechaLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  fechaValue: {
    fontSize: 15,
    color: colors.text,
    marginTop: 2,
  },
});
