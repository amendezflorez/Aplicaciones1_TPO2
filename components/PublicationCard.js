import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { CATEGORIAS } from '../config/constants';
import { colors, spacing, typography } from '../config/theme';
import {
  formatCoordenadas,
  formatDistanciaKm,
  formatFechaSuceso,
} from '../utils/publicacionFormatters';
import Card from './Card';
import EstadoChip from './EstadoChip';
import FotoPublicacion from './FotoPublicacion';
import TipoBadge from './TipoBadge';

// Item de Resultados (Punto 3) y de "Seguidas" (Punto 9).
// Consigna punto 3: título, categoría, barrio, fecha del suceso y coordenadas junto a las fotos.
export default function PublicationCard({ publicacion, onPress, distanciaKm }) {
  const categoria = CATEGORIAS.find((c) => c.id === publicacion.categoria);
  const coords = formatCoordenadas(publicacion.lat, publicacion.lng);
  const distancia = formatDistanciaKm(distanciaKm);
  // Misma fuente que el detalle (fotos[].url); fotoPrincipalUrl queda de respaldo.
  const urlFoto = publicacion.fotos?.[0]?.url ?? publicacion.fotoPrincipalUrl;

  return (
    <Card onPress={onPress} padded={false} style={styles.card} accessibilityLabel={publicacion.titulo}>
      <View style={styles.fotoWrap}>
        <FotoPublicacion key={urlFoto} url={urlFoto} style={styles.foto} />
        {publicacion.tipo ? <TipoBadge tipo={publicacion.tipo} solid style={styles.tipo} /> : null}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={styles.categoria} numberOfLines={1}>
            {categoria?.label ?? publicacion.categoria}
          </Text>
          <EstadoChip estado={publicacion.estado} />
        </View>

        <Text style={styles.titulo} numberOfLines={2}>
          {publicacion.titulo}
        </Text>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {publicacion.barrio?.name ?? 'Sin barrio'}
            {distancia ? ` · a ${distancia}` : ''}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
          <Text style={styles.meta} numberOfLines={1}>
            {formatFechaSuceso(publicacion.fechaSuceso)}
          </Text>
        </View>

        {coords ? (
          <View style={styles.metaRow}>
            <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
            <Text style={styles.coords} numberOfLines={1}>
              {coords}
            </Text>
          </View>
        ) : null}

        {publicacion.cambioEstado ? (
          <View style={styles.novedad}>
            <View style={styles.dot} />
            <Text style={styles.novedadText}>Cambió de estado</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    overflow: 'hidden',
  },
  // Alto fijo para la columna de la foto: la altura de la tarjeta la define el texto (info),
  // así una foto grande no estira la tarjeta a toda la pantalla. La imagen llena la columna.
  // Medidas fijas numéricas: sin posición absoluta ni porcentajes (en Android la foto de la
  // tarjeta no se dibujaba con esas). La tarjeta igual la define el texto.
  fotoWrap: {
    width: 128,
    height: 132,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  foto: {
    width: 128,
    height: 132,
    backgroundColor: colors.surface,
  },
  tipo: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
  },
  info: {
    flex: 1,
    padding: spacing.md - 4,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  categoria: {
    ...typography.overline,
    color: colors.primary,
    flexShrink: 1,
  },
  titulo: {
    ...typography.subheading,
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  coords: {
    ...typography.mono,
    flex: 1,
  },
  novedad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  novedadText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accent,
  },
});
