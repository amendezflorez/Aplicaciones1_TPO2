import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RANGOS_FECHA } from '../config/constants';
import { colors, radius, spacing, typography } from '../config/theme';
import { RANGO_CORTO } from '../utils/busqueda';
import { formatFecha } from '../utils/publicacionFormatters';
import Chip from './Chip';

// "Cuándo": chips Hoy / 3 días / Semana / Elegir fechas (+ "Cualquier momento" para no
// filtrar). @react-native-community/datetimepicker no tiene modo "range": "Elegir fechas"
// muestra dos pickers, desde y hasta. display="default": en Android abre como diálogo
// nativo; en iOS (14+) muestra un botón compacto que abre un calendario.
// onChange (event, date) está deprecado en la 9.x instalada a favor de onValueChange (se
// llama solo cuando la persona confirma un valor) + onDismiss (cierra sin elegir nada).
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
        <Chip
          label="Cualquier momento"
          icon="infinite-outline"
          selected={!rango}
          onPress={() => onSelectRango(null)}
        />
        {RANGOS_FECHA.map((r) => (
          <Chip
            key={r.id}
            label={RANGO_CORTO[r.id] ?? r.label}
            icon={r.id === 'personalizado' ? 'calendar-outline' : undefined}
            selected={rango === r.id}
            onPress={() => onSelectRango(r.id)}
          />
        ))}
      </View>

      {rango === 'personalizado' ? (
        <View style={styles.fechas}>
          <CampoFecha label="Desde" fecha={desde} onPress={() => setMostrando('desde')} />
          <CampoFecha label="Hasta" fecha={hasta} onPress={() => setMostrando('hasta')} />
        </View>
      ) : null}

      {mostrando === 'desde' ? (
        <DateTimePicker
          value={desde ?? new Date()}
          mode="date"
          display="default"
          maximumDate={hasta ?? new Date()}
          onValueChange={handleValueChange(onChangeDesde)}
          onDismiss={handleDismiss}
        />
      ) : null}
      {mostrando === 'hasta' ? (
        <DateTimePicker
          value={hasta ?? new Date()}
          mode="date"
          display="default"
          minimumDate={desde ?? undefined}
          maximumDate={new Date()}
          onValueChange={handleValueChange(onChangeHasta)}
          onDismiss={handleDismiss}
        />
      ) : null}
    </View>
  );
}

function CampoFecha({ label, fecha, onPress }) {
  return (
    <Pressable
      style={[styles.campo, fecha && styles.campoLleno]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${fecha ? formatFecha(fecha, { conAnio: true }) : 'elegir fecha'}`}
    >
      <Text style={styles.campoLabel}>{label}</Text>
      <View style={styles.campoFila}>
        <Ionicons name="calendar-outline" size={18} color={fecha ? colors.primary : colors.textMuted} />
        <Text style={[styles.campoValor, !fecha && styles.campoVacio]}>
          {fecha ? formatFecha(fecha, { conAnio: true }) : 'Elegir'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fechas: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  campo: {
    flex: 1,
    minHeight: 64,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  campoLleno: {
    borderColor: colors.primary,
  },
  campoLabel: {
    ...typography.caption,
  },
  campoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  campoValor: {
    ...typography.bodyStrong,
  },
  campoVacio: {
    color: colors.textMuted,
    fontWeight: '400',
  },
});
