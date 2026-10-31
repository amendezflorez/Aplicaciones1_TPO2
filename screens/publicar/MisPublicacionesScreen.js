import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, FlatList, Image, RefreshControl, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import OfflineBanner from '../../components/OfflineBanner';
import PublicationCard from '../../components/PublicationCard';
import { colors, radius, spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { descartarItem, listarCola, pasarAEdicion } from '../../services/offline/colaPendientes';
import { escucharColaProcesada } from '../../services/offline/colaProcesador';
import { getMisPublicaciones, renovarPublicacion } from '../../services/publicacionesService';
import { getBarrios } from '../../services/userService';

// "Mis publicaciones" (sección 4.5 del plan 5/6 + sección 10.x de la cola offline del
// Punto 6): es la pantalla inicial de la tab Publicar — mismo criterio que
// ReclamosNavigator, donde la bandeja es la puerta de entrada y no el formulario.
// La lista combina dos fuentes: lo que ya está publicado en el servidor
// (MiPublicacionResponse, vía PublicationCard tal cual) y la cola local de pendientes de
// envío (services/offline/colaPendientes.js), que siempre está disponible aunque no haya
// conexión. No usa <Screen> (necesita una tab bar propia arriba de la lista) así que el
// OfflineBanner se agrega a mano.
export default function MisPublicacionesScreen({ navigation }) {
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const [items, setItems] = useState([]);
  const [cola, setCola] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [renovandoId, setRenovandoId] = useState(null);
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  // `silencioso`: refresco disparado por la cola (ver abajo), sin spinner de carga.
  const cargar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setLoading(true);
    setCola(await listarCola(user.id));
    if (!sinConexion) {
      try {
        setItems(await getMisPublicaciones());
        setError('');
      } catch (e) {
        // Sin conexión: igual se muestra la cola (siempre local). Con conexión pero error
        // real del servidor, sí se avisa.
        if (!esErrorDeRed(e)) setError(getErrorMessage(e));
      }
    }
    setLoading(false);
  }, [sinConexion, user.id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
      getBarrios().then(setBarrios).catch(() => {});
    }, [cargar])
  );

  // Punto 6: al reconectar, la cola se procesa en segundo plano (AuthContext →
  // colaProcesador). Si esta pantalla está abierta, cada pendiente enviado (o rechazado)
  // la refresca sola: desaparece de pendientes y aparece como publicada.
  useEffect(
    () =>
      escucharColaProcesada((userId) => {
        if (userId === user.id) cargar({ silencioso: true });
      }),
    [cargar, user.id]
  );

  const renovar = async (id) => {
    setRenovandoId(id);
    try {
      const actualizada = await renovarPublicacion(id);
      setItems((actuales) => actuales.map((item) => (item.id === id ? actualizada : item)));
    } catch (e) {
      Alert.alert('No se pudo renovar', getErrorMessage(e));
    } finally {
      setRenovandoId(null);
    }
  };

  const editarPendiente = async (item) => {
    setAccionEnCurso(item.clientRequestId);
    try {
      await pasarAEdicion(user.id, item.clientRequestId);
      navigation.navigate('PublicarWizard');
    } finally {
      setAccionEnCurso(null);
      setCola(await listarCola(user.id));
    }
  };

  const descartarPendiente = (item) => {
    Alert.alert('Descartar publicación', `¿Descartás "${item.borrador.titulo}"? No se va a enviar.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          setAccionEnCurso(item.clientRequestId);
          try {
            await descartarItem(user.id, item.clientRequestId);
          } finally {
            setAccionEnCurso(null);
            setCola(await listarCola(user.id));
          }
        },
      },
    ]);
  };

  const irAPublicar = () => navigation.navigate('PublicarWizard');
  const irAlDetalle = (id) => navigation.navigate('Buscar', { screen: 'DetallePublicacion', params: { id } });

  // Pendientes primero (son las que necesitan atención/están "en progreso"), después lo
  // ya publicado. Cada fila lleva un `tipo` para que renderItem sepa qué card armar.
  const filas = [
    ...cola.map((item) => ({ tipo: 'pendiente', item })),
    ...items.map((item) => ({ tipo: 'publicada', item })),
  ];

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.header}>
        <Button title="+ Nueva publicación" onPress={irAPublicar} />
      </View>
      <ErrorText message={error} />
      {sinConexion ? (
        <Text style={styles.avisoSinConexion}>Necesitás conexión para renovar publicaciones.</Text>
      ) : null}
      <FlatList
        data={filas}
        keyExtractor={(fila) => (fila.tipo === 'pendiente' ? fila.item.clientRequestId : fila.item.id)}
        contentContainerStyle={[styles.lista, !filas.length && styles.listaVacia]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargar} tintColor={colors.primary} />}
        renderItem={({ item: fila }) =>
          fila.tipo === 'pendiente' ? (
            <PendienteCard
              item={fila.item}
              barrios={barrios}
              onEditar={() => editarPendiente(fila.item)}
              onDescartar={() => descartarPendiente(fila.item)}
              busy={accionEnCurso === fila.item.clientRequestId}
            />
          ) : (
            <View style={styles.item}>
              <PublicationCard publicacion={fila.item} onPress={() => irAlDetalle(fila.item.id)} />
              {fila.item.puedeRenovar ? (
                <Button
                  title="Renovar"
                  variant="secondary"
                  onPress={() => renovar(fila.item.id)}
                  loading={renovandoId === fila.item.id}
                  disabled={sinConexion}
                />
              ) : null}
            </View>
          )
        }
        ListEmptyComponent={
          <View style={styles.vacio}>
            <Text style={styles.vacioTitulo}>Todavía no publicaste nada</Text>
            <Text style={styles.vacioTexto}>Publicá lo que perdiste o encontraste para que otros lo vean.</Text>
          </View>
        }
      />
    </View>
  );
}

// Punto 6 (sección 4.4 del plan): una publicación todavía no enviada. 'pendiente' espera
// su turno en la cola (sin acciones, se procesa sola); 'error' (un 4xx del backend) ofrece
// Editar (reabre el wizard con esos datos, vía pasarAEdicion) o Descartar.
function PendienteCard({ item, barrios, onEditar, onDescartar, busy }) {
  const barrio = barrios.find((b) => b.id === item.borrador.barrioId);
  const foto = item.borrador.fotos?.[0]?.uri;
  const esError = item.estado === 'error';

  return (
    <View style={styles.item}>
      <View style={styles.pendienteCard}>
        {foto ? (
          <Image source={{ uri: foto }} style={styles.pendienteFoto} />
        ) : (
          <View style={[styles.pendienteFoto, styles.pendienteFotoVacia]} />
        )}
        <View style={styles.pendienteInfo}>
          <Text style={styles.pendienteTitulo} numberOfLines={2}>
            {item.borrador.titulo || 'Sin título'}
          </Text>
          <Text style={styles.pendienteMeta}>{barrio?.name ?? 'Sin barrio'}</Text>
          <View style={[styles.pendienteChip, esError && styles.pendienteChipError]}>
            <Text style={styles.pendienteChipTexto}>{esError ? 'Error al enviar' : 'Pendiente de envío'}</Text>
          </View>
          {esError && item.mensajeError ? <Text style={styles.pendienteError}>{item.mensajeError}</Text> : null}
        </View>
      </View>
      {esError ? (
        <View style={styles.pendienteBotones}>
          <Button title="Editar" variant="secondary" onPress={onEditar} loading={busy} />
          <Button title="Descartar" variant="secondary" onPress={onDescartar} loading={busy} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.md, paddingBottom: 0 },
  avisoSinConexion: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  lista: { padding: spacing.md, gap: spacing.sm },
  listaVacia: { flexGrow: 1, justifyContent: 'center' },
  item: { gap: spacing.xs },
  vacio: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  vacioTitulo: { color: colors.text, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  vacioTexto: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
  pendienteCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  pendienteFoto: { width: 72, height: 72, borderRadius: radius.sm },
  pendienteFotoVacia: { backgroundColor: colors.surface },
  pendienteInfo: { flex: 1, gap: 2 },
  pendienteTitulo: { fontSize: 15, fontWeight: '700', color: colors.text },
  pendienteMeta: { fontSize: 13, color: colors.textMuted },
  pendienteChip: {
    alignSelf: 'flex-start',
    marginTop: 2,
    borderRadius: radius.round,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.accent,
  },
  pendienteChipError: { backgroundColor: colors.error },
  pendienteChipTexto: { color: colors.white, fontWeight: '600', fontSize: 12 },
  pendienteError: { fontSize: 12, color: colors.error },
  pendienteBotones: { flexDirection: 'row', gap: spacing.sm },
});
