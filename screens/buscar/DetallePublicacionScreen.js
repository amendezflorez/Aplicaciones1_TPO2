import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import ErrorText from '../../components/ErrorText';
import EstadoChip from '../../components/EstadoChip';
import Loading from '../../components/Loading';
import Screen from '../../components/Screen';
import { CATEGORIAS } from '../../config/constants';
import { colors, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { getDetallePublicacion } from '../../services/publicacionesService';
import { formatFechaRelativa, formatFranjaHoraria } from '../../utils/publicacionFormatters';

// PLACEHOLDER del Punto 4 (Detalle de la Publicación): hoy solo muestra los datos básicos
// para que el tap en un resultado del Punto 3 no quede sin destino. La versión completa
// (galería, card del publicador, "Es mío"/"Lo encontré", seguir, gestión propia — sección
// 4.3 del plan) se construye en feature_4, siguiendo ese mismo orden pedido.
export default function DetallePublicacionScreen({ route }) {
  const { id } = route.params;
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDetallePublicacion(id)
      .then(setDetalle)
      .catch((e) => setError(getErrorMessage(e)));
  }, [id]);

  if (error) {
    return (
      <Screen>
        <ErrorText message={error} />
      </Screen>
    );
  }

  if (!detalle) return <Loading />;

  const categoriaLabel = CATEGORIAS.find((c) => c.id === detalle.categoria)?.label ?? detalle.categoria;

  return (
    <Screen>
      {detalle.fotoPrincipalUrl ? (
        <Image source={{ uri: detalle.fotoPrincipalUrl }} style={styles.foto} />
      ) : null}
      <View style={styles.header}>
        <Text style={styles.titulo}>{detalle.titulo}</Text>
        <EstadoChip estado={detalle.estado} />
      </View>
      <Text style={styles.meta}>
        {categoriaLabel} · {detalle.barrio?.name ?? 'Sin barrio'}
      </Text>
      <Text style={styles.meta}>
        {formatFechaRelativa(detalle.fechaSuceso)}
        {detalle.franjaHoraria ? ` · ${formatFranjaHoraria(detalle.franjaHoraria)}` : ''}
      </Text>
      <Text style={styles.descripcion}>{detalle.descripcion}</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  foto: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  titulo: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 14,
    color: colors.textMuted,
  },
  descripcion: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
});
