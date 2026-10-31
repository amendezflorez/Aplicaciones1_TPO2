import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BarrioOUbicacionPicker from '../../components/BarrioOUbicacionPicker';
import Button from '../../components/Button';
import CategoriaPicker from '../../components/CategoriaPicker';
import ErrorText from '../../components/ErrorText';
import Loading from '../../components/Loading';
import PublicationCard from '../../components/PublicationCard';
import RangoFechaPicker from '../../components/RangoFechaPicker';
import Screen from '../../components/Screen';
import { SEARCH_PAGE_SIZE } from '../../config/constants';
import { colors, radius, spacing } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { crearAlerta } from '../../services/alertasService';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { guardarResultados, obtenerUltimosResultados } from '../../services/offline/resultadosCache';
import { buscarPublicaciones } from '../../services/publicacionesService';
import { getBarrios } from '../../services/userService';

// Listado paginado + refinar + ordenar (sección 4.2 del plan). "cercanos" solo se habilita
// si los filtros activos ya traen lat/lng (se usó ubicación en el buscador o al refinar).
export default function ResultadosScreen({ route, navigation }) {
  const { sinConexion } = useConnectivity();
  const [filtros, setFiltros] = useState(route.params.filtros);
  const [orden, setOrden] = useState('recientes');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [refineVisible, setRefineVisible] = useState(false);
  // Punto 6 (sección 4.3 del plan): true cuando lo que se muestra viene del caché de la
  // última búsqueda exitosa (sin conexión, o la request falló por red), no de un fetch
  // recién hecho — desactiva la paginación (no tiene sentido pedir "más" de un snapshot
  // fijo) y muestra el aviso de que la información puede no estar actualizada.
  const [mostrandoCache, setMostrandoCache] = useState(false);

  const tieneUbicacion = filtros.lat != null && filtros.lng != null;

  const cargarDesdeCache = useCallback(async (mensajeSiNoHay) => {
    setLoading(true);
    const cacheado = await obtenerUltimosResultados();
    setLoading(false);
    if (cacheado) {
      setItems(cacheado.data);
      setTotal(cacheado.total);
      setPage(0);
      setMostrandoCache(true);
      setError('');
    } else {
      setItems([]);
      setTotal(0);
      setMostrandoCache(false);
      setError(mensajeSiNoHay);
    }
  }, []);

  const cargarPagina = useCallback(
    async (pageNum, append) => {
      if (sinConexion) {
        await cargarDesdeCache('No hay conexión y todavía no guardamos resultados de una búsqueda anterior.');
        return;
      }
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);
        const resultado = await buscarPublicaciones({
          ...filtros,
          orden,
          page: pageNum,
          size: SEARCH_PAGE_SIZE,
        });
        setItems((actuales) => (append ? [...actuales, ...resultado.data] : resultado.data));
        setTotal(resultado.total);
        setPage(resultado.page);
        setError('');
        setMostrandoCache(false);
        // Solo la primera página de cada búsqueda: alcanza con "los últimos resultados
        // cargados" (sección 4.3 del plan), no hace falta cachear todo el scroll
        // acumulado de "cargar más".
        if (!append) guardarResultados({ filtros, orden, data: resultado.data, total: resultado.total });
      } catch (e) {
        if (esErrorDeRed(e)) {
          await cargarDesdeCache(getErrorMessage(e));
          return;
        }
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filtros, orden, sinConexion, cargarDesdeCache]
  );

  useEffect(() => {
    cargarPagina(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, orden, sinConexion]);

  const pedirSiguientePagina = () => {
    if (loadingMore || loading || mostrandoCache) return;
    if (items.length >= total) return;
    cargarPagina(page + 1, true);
  };

  const cambiarOrden = (nuevoOrden) => {
    if (nuevoOrden === 'cercanos' && !tieneUbicacion) return;
    setOrden(nuevoOrden);
  };

  // "Guardar como alerta" necesita conexión (Punto 6, sección 5 del plan).
  const guardarComoAlerta = async () => {
    try {
      await crearAlerta(filtros);
      Alert.alert('Listo', 'Guardamos esta búsqueda como alerta. Te vamos a avisar de novedades.');
    } catch (e) {
      Alert.alert('No se pudo guardar', getErrorMessage(e));
    }
  };

  // Punto 5: precarga el wizard con lo que la persona ya tipeó acá (sección 4 de
  // PLAN_puntos_5_y_6.md) — tipoBuscado es literalmente "perdí/encontré" tal como lo
  // eligió en el paso 1 del buscador, mismo valor que espera el wizard como "tipo".
  const irAPublicar = () => {
    navigation.navigate('Publicar', {
      screen: 'PublicarWizard',
      params: { tipo: filtros.tipoBuscado, categoria: filtros.categoria, barrioId: filtros.barrioId },
    });
  };

  return (
    <Screen scroll={false}>
      <View style={styles.barraOrden}>
        <TouchableOpacity
          style={[styles.ordenChip, orden === 'recientes' && styles.ordenChipActive]}
          onPress={() => cambiarOrden('recientes')}
        >
          <Text style={[styles.ordenText, orden === 'recientes' && styles.ordenTextActive]}>Recientes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.ordenChip,
            orden === 'cercanos' && styles.ordenChipActive,
            !tieneUbicacion && styles.ordenChipDisabled,
          ]}
          onPress={() => cambiarOrden('cercanos')}
          disabled={!tieneUbicacion}
        >
          <Text style={[styles.ordenText, orden === 'cercanos' && styles.ordenTextActive]}>Cercanos</Text>
        </TouchableOpacity>
        <View style={styles.espacio} />
        <Button title="Refinar" variant="secondary" onPress={() => setRefineVisible(true)} />
      </View>

      {mostrandoCache ? (
        <Text style={styles.avisoCache}>
          Mostrando los últimos resultados guardados — pueden no estar actualizados.
        </Text>
      ) : null}
      <ErrorText message={error} />

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <View style={styles.vacio}>
          <Text style={styles.vacioTexto}>No encontramos publicaciones con estos filtros.</Text>
          <Button
            title={filtros.tipoBuscado === 'perdido' ? 'Publicar lo que perdí' : 'Publicar lo que encontré'}
            onPress={irAPublicar}
          />
          <Button
            title="Guardar esta búsqueda como alerta"
            variant="secondary"
            onPress={guardarComoAlerta}
            disabled={sinConexion}
          />
          {sinConexion ? (
            <Text style={styles.avisoSinConexion}>Necesitás conexión para guardar una alerta.</Text>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lista}
          renderItem={({ item }) => (
            <PublicationCard
              publicacion={item}
              onPress={() => navigation.navigate('DetallePublicacion', { id: item.id })}
            />
          )}
          onEndReachedThreshold={0.4}
          onEndReached={pedirSiguientePagina}
          ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} /> : null}
        />
      )}

      <RefinarModal
        visible={refineVisible}
        filtrosIniciales={filtros}
        onClose={() => setRefineVisible(false)}
        onAplicar={(nuevosFiltros) => {
          setFiltros(nuevosFiltros);
          setRefineVisible(false);
        }}
      />
    </Screen>
  );
}

// Reabre los mismos controles de los pasos 2-4 del wizard, sin volver al paso 1
// (sección 4.2 del plan): tipoBuscado no se puede cambiar acá, solo categoría/texto/
// lugar/fecha.
function RefinarModal({ visible, filtrosIniciales, onClose, onAplicar }) {
  const [categoria, setCategoria] = useState(filtrosIniciales.categoria ?? null);
  const [barrioId, setBarrioId] = useState(filtrosIniciales.barrioId ?? null);
  const [barrios, setBarrios] = useState([]);
  const [rango, setRango] = useState(filtrosIniciales.rango ?? null);
  const [desde, setDesde] = useState(filtrosIniciales.desde ? new Date(filtrosIniciales.desde) : null);
  const [hasta, setHasta] = useState(filtrosIniciales.hasta ? new Date(filtrosIniciales.hasta) : null);
  const { ubicacion, cargando, error: errorUbicacion, obtenerUbicacion, abrirConfiguracion } = useUbicacionActual();

  useEffect(() => {
    if (visible) getBarrios().then(setBarrios).catch(() => {});
  }, [visible]);

  const tieneUbicacionInicial = filtrosIniciales.lat != null;
  const [ubicacionActiva, setUbicacionActiva] = useState(tieneUbicacionInicial);

  const usarUbicacion = async () => {
    const coords = await obtenerUbicacion();
    if (coords) {
      setBarrioId(null);
      setUbicacionActiva(true);
    }
  };

  const aplicar = () => {
    onAplicar({
      ...filtrosIniciales,
      categoria: categoria ?? undefined,
      barrioId: ubicacionActiva ? undefined : (barrioId ?? undefined),
      lat: ubicacionActiva ? (ubicacion?.lat ?? filtrosIniciales.lat) : undefined,
      lng: ubicacionActiva ? (ubicacion?.lng ?? filtrosIniciales.lng) : undefined,
      rango: rango ?? undefined,
      desde: rango === 'personalizado' ? desde?.toISOString() : undefined,
      hasta: rango === 'personalizado' ? hasta?.toISOString() : undefined,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.modal}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitulo}>Refinar búsqueda</Text>
          <CategoriaPicker selected={categoria} onSelect={setCategoria} />
          <BarrioOUbicacionPicker
            barrios={barrios}
            barrioId={barrioId}
            onSelectBarrio={(b) => {
              setBarrioId(b.id);
              setUbicacionActiva(false);
            }}
            ubicacion={ubicacionActiva ? (ubicacion ?? { lat: filtrosIniciales.lat, lng: filtrosIniciales.lng }) : null}
            cargandoUbicacion={cargando}
            error={errorUbicacion}
            onUsarUbicacion={usarUbicacion}
            onQuitarUbicacion={() => setUbicacionActiva(false)}
            onAbrirConfiguracion={abrirConfiguracion}
          />
          <RangoFechaPicker
            rango={rango}
            onSelectRango={setRango}
            desde={desde}
            hasta={hasta}
            onChangeDesde={setDesde}
            onChangeHasta={setHasta}
          />
        </View>
        <View style={styles.modalFooter}>
          <Button title="Cancelar" variant="secondary" onPress={onClose} />
          <Button title="Aplicar" onPress={aplicar} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avisoCache: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
  },
  avisoSinConexion: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  barraOrden: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  ordenChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md - 4,
  },
  ordenChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  ordenChipDisabled: {
    opacity: 0.4,
  },
  ordenText: {
    fontSize: 13,
    color: colors.text,
  },
  ordenTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  espacio: {
    flex: 1,
  },
  lista: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  footerLoader: {
    marginVertical: spacing.md,
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  vacioTexto: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
  },
  modal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
});
