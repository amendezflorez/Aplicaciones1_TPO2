import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EstadoChip from './EstadoChip';
import { CATEGORIAS } from '../config/constants';
import { colors, radius, spacing } from '../config/theme';
import { formatFechaRelativa } from '../utils/publicacionFormatters';

// Item de ResultadosScreen y de "Seguidas" (sección 4.2 del plan).
export default function PublicationCard({ publicacion, onPress }) {
  const categoriaLabel = CATEGORIAS.find((c) => c.id === publicacion.categoria)?.label ?? publicacion.categoria;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      {publicacion.fotoPrincipalUrl ? (
        <Image source={{ uri: publicacion.fotoPrincipalUrl }} style={styles.foto} />
      ) : (
        <View style={[styles.foto, styles.fotoPlaceholder]}>
          <Text style={styles.fotoPlaceholderText}>Sin foto</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={2}>
          {publicacion.titulo}
        </Text>
        <Text style={styles.meta}>
          {categoriaLabel} · {publicacion.barrio?.name ?? 'Sin barrio'}
        </Text>
        <Text style={styles.meta}>{formatFechaRelativa(publicacion.fechaSuceso)}</Text>
        <EstadoChip estado={publicacion.estado} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  foto: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
  },
  fotoPlaceholder: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoPlaceholderText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
