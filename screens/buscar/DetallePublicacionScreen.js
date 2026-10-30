import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import EstadoChip from '../../components/EstadoChip';
import Loading from '../../components/Loading';
import PhotoGallery from '../../components/PhotoGallery';
import Screen from '../../components/Screen';
import { CATEGORIAS } from '../../config/constants';
import { colors, radius, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { getDetallePublicacion } from '../../services/publicacionesService';
import { dejarDeSeguirPublicacion, seguirPublicacion } from '../../services/seguimientosService';
import { getPublicProfile } from '../../services/userService';
import { formatFechaRelativa, formatFranjaHoraria } from '../../utils/publicacionFormatters';

// Punto 4 completo (sección 4.3 del plan): galería, descripción, categoría, fecha+franja,
// estado, barrio, card del publicador (link a su perfil público) y la botonera condicional
// según esPropia/tipo/yaReclame/siguiendo. "Sin conexión" (Punto 6) queda afuera: esta
// pantalla recibe la publicación ya resuelta y no le importa de dónde salió.
export default function DetallePublicacionScreen({ route, navigation }) {
  const { id } = route.params;
  const [detalle, setDetalle] = useState(null);
  const [publicadorReputacion, setPublicadorReputacion] = useState(null);
  const [error, setError] = useState('');
  const [siguiendo, setSiguiendo] = useState(false);
  const [cambiandoSeguir, setCambiandoSeguir] = useState(false);

  // useFocusEffect (no useEffect simple) para refrescar yaReclame/estado al volver de
  // IniciarReclamoScreen, no solo al entrar por primera vez.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      getDetallePublicacion(id)
        .then((d) => {
          if (!vigente) return;
          setDetalle(d);
          setSiguiendo(d.siguiendo);
          setError('');
          if (!d.esPropia) {
            getPublicProfile(d.publicador.id)
              .then((p) => vigente && setPublicadorReputacion(p.reputation))
              .catch(() => {});
          }
        })
        .catch((e) => vigente && setError(getErrorMessage(e)));
      return () => {
        vigente = false;
      };
    }, [id])
  );

  const toggleSeguir = async () => {
    setCambiandoSeguir(true);
    const siguiendoAntes = siguiendo;
    setSiguiendo(!siguiendoAntes);
    try {
      if (siguiendoAntes) {
        await dejarDeSeguirPublicacion(id);
      } else {
        await seguirPublicacion(id);
      }
    } catch (e) {
      // 409 al seguir una que ya seguías: lo tratamos como éxito (sección 3 del plan),
      // no revertimos el estado optimista.
      if (e.response?.status !== 409) {
        setSiguiendo(siguiendoAntes);
        Alert.alert('No se pudo actualizar', getErrorMessage(e));
      }
    } finally {
      setCambiandoSeguir(false);
    }
  };

  // Punto 5: "Mis publicaciones" (tab Publicar) es donde vive la gestión real —
  // renovarla ahí mismo, sin un detalle de gestión aparte para esta sola publicación.
  const gestionarPublicacion = () => {
    navigation.navigate('Publicar', { screen: 'MisPublicaciones' });
  };

  const irAReclamo = (tipo) => {
    navigation.navigate('IniciarReclamo', {
      id,
      tipo,
      preguntaVerificacion: detalle.preguntaVerificacion,
    });
  };

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
      <PhotoGallery fotos={detalle.fotos} />

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

      {detalle.direccionExacta ? (
        <View style={styles.direccionBox}>
          <Text style={styles.direccionTitulo}>Ubicación exacta</Text>
          <Text style={styles.meta}>{detalle.direccionExacta}</Text>
        </View>
      ) : null}

      {!detalle.esPropia ? (
        <TouchableOpacity
          style={styles.publicadorCard}
          onPress={() =>
            navigation.navigate('Perfil', { screen: 'PublicProfile', params: { userId: detalle.publicador.id } })
          }
        >
          <Avatar uri={detalle.publicador.photoUrl} name={detalle.publicador.name} size={48} />
          <View style={styles.publicadorInfo}>
            <Text style={styles.publicadorNombre}>{detalle.publicador.name}</Text>
            {publicadorReputacion ? (
              <Text style={styles.meta}>
                {publicadorReputacion.returnsCount} devoluciones · {publicadorReputacion.positiveCount} valoraciones
                positivas
              </Text>
            ) : null}
          </View>
          <Text style={styles.verPerfil}>Ver perfil ›</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.acciones}>
        {detalle.esPropia ? (
          <Button title="Gestionar publicación" onPress={gestionarPublicacion} />
        ) : detalle.yaReclame ? (
          <Button title="Ya enviaste un reclamo" disabled onPress={() => {}} />
        ) : detalle.tipo === 'encontrado' ? (
          <Button title="Es mío" onPress={() => irAReclamo('es_mio')} />
        ) : (
          <Button title="Lo encontré" onPress={() => irAReclamo('lo_encontre')} />
        )}

        {!detalle.esPropia ? (
          <Button
            title={siguiendo ? 'Dejar de seguir' : 'Seguir'}
            variant="secondary"
            onPress={toggleSeguir}
            loading={cambiandoSeguir}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  direccionBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  direccionTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  publicadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  publicadorInfo: {
    flex: 1,
    gap: 2,
  },
  publicadorNombre: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  verPerfil: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  acciones: {
    gap: spacing.sm,
  },
});
