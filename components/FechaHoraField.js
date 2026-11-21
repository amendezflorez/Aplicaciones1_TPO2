import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createElement, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';
import { formatFecha } from '../utils/publicacionFormatters';

const dosDigitos = (n) => String(n).padStart(2, '0');
const aInputFecha = (d) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
const aInputHora = (d) => `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;

// Combina la parte "día" de `base` con la parte "hora" de `otro` (y viceversa según el modo).
function combinar(base, elegida, modo) {
  const r = new Date(base);
  if (modo === 'date') r.setFullYear(elegida.getFullYear(), elegida.getMonth(), elegida.getDate());
  else r.setHours(elegida.getHours(), elegida.getMinutes(), 0, 0);
  return r;
}

// Selector de fecha Y hora del suceso (consigna punto 5: "fecha y hora"). Dos campos
// tocables lado a lado que abren el selector nativo (mode date / mode time). En web, donde
// @react-native-community/datetimepicker no existe, usa <input type="date|time"> nativos.
export default function FechaHoraField({ value, onChange, error }) {
  const [modo, setModo] = useState(null); // 'date' | 'time' | null
  const esWeb = Platform.OS === 'web';

  const campo = (tipoCampo, icono, etiqueta, texto) => {
    const contenido = (
      <>
        <Ionicons name={icono} size={18} color={colors.primary} />
        <View style={styles.textos}>
          <Text style={styles.etiqueta}>{etiqueta}</Text>
          <Text style={styles.valor}>{texto}</Text>
        </View>
      </>
    );
    if (esWeb) {
      return (
        <View style={[styles.campo, error && styles.campoError]}>
          {contenido}
          {createElement('input', {
            type: tipoCampo,
            value: tipoCampo === 'date' ? aInputFecha(value) : aInputHora(value),
            max: tipoCampo === 'date' ? aInputFecha(new Date()) : undefined,
            onChange: (e) => {
              const v = e.target.value;
              if (!v) return;
              const [a, b, c] = v.split(/[-:]/).map(Number);
              const elegida = tipoCampo === 'date' ? new Date(a, b - 1, c, 12) : new Date(2000, 0, 1, a, b);
              onChange(combinar(value, elegida, tipoCampo));
            },
            style: { position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' },
            'aria-label': etiqueta,
          })}
        </View>
      );
    }
    return (
      <Pressable
        style={[styles.campo, error && styles.campoError]}
        onPress={() => setModo(tipoCampo)}
        accessibilityRole="button"
        accessibilityLabel={`${etiqueta}: ${texto}. Tocá para cambiar`}
      >
        {contenido}
      </Pressable>
    );
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.fila}>
        {campo('date', 'calendar-outline', 'Fecha', formatFecha(value.toISOString(), { conAnio: true }))}
        {campo('time', 'time-outline', 'Hora', `${aInputHora(value)} hs`)}
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={colors.error} />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}
      {!esWeb && modo ? (
        // onChange está deprecado en la versión instalada (src/index.d.ts del paquete) a
        // favor de onValueChange (al confirmar) + onDismiss (al cerrar sin elegir).
        <DateTimePicker
          value={value}
          mode={modo}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          is24Hour
          maximumDate={modo === 'date' ? new Date() : undefined}
          onValueChange={(event, elegida) => {
            const actual = modo;
            setModo(null);
            if (elegida) onChange(combinar(value, elegida, actual));
          }}
          onDismiss={() => setModo(null)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  fila: { flexDirection: 'row', gap: spacing.sm },
  campo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md - 2,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  campoError: { borderColor: colors.error },
  textos: { flex: 1 },
  etiqueta: { ...typography.caption },
  valor: { ...typography.bodyStrong },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { fontSize: 13, color: colors.error, flex: 1 },
});
