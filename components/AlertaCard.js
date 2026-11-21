import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { CATEGORIAS } from '../config/constants';
import { colors, radius, spacing, typography } from '../config/theme';
import { formatFecha } from '../utils/publicacionFormatters';
import Button from './Button';
import Card from './Card';
import Chip from './Chip';

// Ícono por categoría (mismas categorías que config/constants.js).
const ICONO_CATEGORIA = {
  documentos: 'document-text-outline',
  llaves: 'key-outline',
  electronica: 'phone-portrait-outline',
  mascotas: 'paw-outline',
  ropa: 'shirt-outline',
  otros: 'cube-outline',
};

// Tarjeta de "Mis alertas" (Punto 9). La API devuelve tipoBuscado 'perdido' | 'encontrado':
// lo que la persona perdió o encontró; la alerta le avisa de publicaciones del tipo opuesto.
export default function AlertaCard({
  alerta,
  onPress,
  onTogglePausa,
  onEliminar,
  busy = false,
  disabled = false,
}) {
  const categoria = CATEGORIAS.find((c) => c.id === alerta.categoria);
  const perdido = alerta.tipoBuscado === 'perdido';
  const tipoLabel = perdido ? 'Perdí algo' : alerta.tipoBuscado === 'encontrado' ? 'Encontré algo' : 'Cualquier tipo';
  const tipoColor = perdido ? colors.perdido : colors.encontrado;
  const tipoSoft = perdido ? colors.perdidoSoft : colors.encontradoSoft;
  const tipoIcon = perdido ? 'help-circle' : 'hand-left';

  const nuevas = !alerta.pausada && alerta.novedadesCount > 0 ? alerta.novedadesCount : 0;

  return (
    <Card padded={false} style={[styles.card, alerta.pausada && styles.cardPausada]}>
      {/* Solo el cuerpo es tocable: el switch y "Eliminar" quedan afuera para que su toque
          no dispare también la búsqueda (en web el evento burbujea al padre). */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Alerta: ${tipoLabel}. ${nuevas ? `${nuevas} nuevas. ` : ''}Tocá para ver los resultados`}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.85 }]}
      >
        <View style={styles.headerRow}>
          <View style={[styles.tipo, { backgroundColor: tipoSoft }]}>
            <Ionicons name={tipoIcon} size={14} color={tipoColor} />
            <Text style={[styles.tipoText, { color: tipoColor }]}>{tipoLabel}</Text>
          </View>
          {alerta.pausada ? (
            <Chip label="Pausada" tone="neutral" icon="pause" size="sm" />
          ) : (
            <Chip label="Activa" tone="success" icon="notifications" size="sm" />
          )}
        </View>

        <View style={styles.criterios}>
          <Criterio icon={ICONO_CATEGORIA[alerta.categoria] ?? 'apps-outline'}>
            {categoria?.label ?? 'Cualquier categoría'}
          </Criterio>
          <Criterio icon="location-outline">{alerta.barrio?.name ?? 'Cualquier barrio'}</Criterio>
          {alerta.texto ? <Criterio icon="search-outline">{`Palabras clave: “${alerta.texto}”`}</Criterio> : null}
          <Criterio icon="calendar-outline" muted>
            {`Creada el ${formatFecha(alerta.creadaEn)}`}
          </Criterio>
        </View>

        {nuevas > 0 ? (
          <View style={styles.novedades}>
            <View style={styles.novedadesIcon}>
              <Ionicons name="sparkles" size={14} color={colors.white} />
            </View>
            <Text style={styles.novedadesText}>
              {nuevas === 1 ? '1 nueva coincidencia' : `${nuevas} nuevas coincidencias`}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.accent} />
          </View>
        ) : null}
      </Pressable>

      <View style={styles.footer}>
        <View style={styles.switchWrap}>
          {busy ? (
            <ActivityIndicator color={colors.primary} style={styles.switchLoader} />
          ) : (
            <Switch
              value={!alerta.pausada}
              onValueChange={onTogglePausa}
              disabled={disabled}
              trackColor={{ true: colors.primary, false: colors.borderStrong }}
              thumbColor={colors.white}
              accessibilityLabel={alerta.pausada ? 'Activar alerta' : 'Pausar alerta'}
            />
          )}
          <Pressable onPress={disabled || busy ? undefined : onTogglePausa} hitSlop={8} accessibilityRole="button" accessibilityLabel={alerta.pausada ? 'Activar avisos' : 'Pausar avisos'}>
            <Text style={styles.switchLabel}>{alerta.pausada ? 'Avisos pausados' : 'Avisos activos'}</Text>
          </Pressable>
        </View>
        <Button
          title="Eliminar"
          icon="trash-outline"
          variant="danger"
          size="sm"
          onPress={onEliminar}
          disabled={disabled || busy}
        />
      </View>
    </Card>
  );
}

function Criterio({ icon, children, muted = false }) {
  return (
    <View style={styles.criterio}>
      <Ionicons name={icon} size={16} color={colors.textMuted} />
      <Text style={[styles.criterioText, muted && styles.criterioMuted]} numberOfLines={2}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  cardPausada: {
    backgroundColor: colors.background,
  },
  body: {
    padding: spacing.md,
    gap: spacing.md - 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.round,
  },
  tipoText: {
    fontSize: 13,
    fontWeight: '800',
  },
  criterios: {
    gap: spacing.xs + 2,
  },
  criterio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  criterioText: {
    ...typography.body,
    flex: 1,
  },
  criterioMuted: {
    ...typography.caption,
  },
  novedades: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md - 4,
  },
  novedadesIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  novedadesText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: '#B8411F',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  switchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  switchLoader: {
    width: 51,
  },
  switchLabel: {
    ...typography.label,
  },
});
