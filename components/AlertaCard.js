import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORIAS } from '../config/constants';
import { colors, radius, spacing } from '../config/theme';
import { formatFechaRelativa } from '../utils/publicacionFormatters';

export default function AlertaCard({ alerta, onPress, onTogglePausa, onEliminar, disabled }) {
  const categoriaLabel =
    CATEGORIAS.find((c) => c.id === alerta.categoria)?.label ??
    (alerta.categoria ? alerta.categoria : 'Cualquier categoría');

  const tipoLabel =
    alerta.tipoBuscado === 'perdi'
      ? 'Si perdiste algo'
      : alerta.tipoBuscado === 'encontre'
      ? 'Si encontraste algo'
      : 'Cualquier tipo';

  const tieneNovedades = Boolean(alerta.novedadesCount && alerta.novedadesCount > 0 && !alerta.pausada);

  return (
    <TouchableOpacity
      style={[styles.card, alerta.pausada && styles.cardPausada]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.tipoContainer}>
          <Text style={styles.tipoText}>{tipoLabel}</Text>
          {alerta.pausada ? (
            <View style={styles.chipPausada}>
              <Text style={styles.chipPausadaText}>Pausada</Text>
            </View>
          ) : (
            <View style={styles.chipActiva}>
              <Text style={styles.chipActivaText}>Activa</Text>
            </View>
          )}
        </View>
        <Text style={styles.fecha}>{formatFechaRelativa(alerta.creadaEn)}</Text>
      </View>

      <View style={styles.criterios}>
        <Text style={styles.criterio}>
          📁 <Text style={styles.criterioValor}>{categoriaLabel}</Text>
        </Text>
        <Text style={styles.criterio}>
          📍 <Text style={styles.criterioValor}>{alerta.barrio?.name ?? 'Cualquier barrio'}</Text>
        </Text>
        {alerta.texto ? (
          <Text style={styles.criterio}>
            🔍 <Text style={styles.criterioValor}>{`"${alerta.texto}"`}</Text>
          </Text>
        ) : null}
      </View>

      {tieneNovedades ? (
        <View style={styles.novedadBanner}>
          <Text style={styles.novedadText}>
            🔔 {alerta.novedadesCount} {alerta.novedadesCount === 1 ? 'coincidencia nueva' : 'coincidencias nuevas'}
          </Text>
          <Text style={styles.verNovedadesText}>Tocar para ver ›</Text>
        </View>
      ) : null}

      <View style={styles.acciones}>
        <TouchableOpacity
          style={[styles.botonAccion, disabled && styles.botonDeshabilitado]}
          onPress={onTogglePausa}
          disabled={disabled}
        >
          <Text style={styles.botonAccionText}>
            {alerta.pausada ? '▶ Reanudar' : '⏸ Pausar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.botonAccion, styles.botonEliminar, disabled && styles.botonDeshabilitado]}
          onPress={onEliminar}
          disabled={disabled}
        >
          <Text style={[styles.botonAccionText, styles.botonEliminarText]}>🗑 Eliminar</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardPausada: {
    backgroundColor: colors.surface,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tipoText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  chipActiva: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chipActivaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
  },
  chipPausada: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  chipPausadaText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  fecha: {
    fontSize: 12,
    color: colors.textMuted,
  },
  criterios: {
    gap: 2,
    marginVertical: 2,
  },
  criterio: {
    fontSize: 13,
    color: colors.textMuted,
  },
  criterioValor: {
    color: colors.text,
    fontWeight: '500',
  },
  novedadBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  novedadText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  verNovedadesText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B45309',
  },
  acciones: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
    paddingTop: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  botonAccion: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  botonAccionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  botonEliminar: {
    backgroundColor: '#FEE2E2',
  },
  botonEliminarText: {
    color: colors.error,
  },
  botonDeshabilitado: {
    opacity: 0.5,
  },
});
