import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chip from '../../components/Chip';
import PermisoDenegado from '../../components/PermisoDenegado';
import PublicationCard from '../../components/PublicationCard';
import RefinarBusquedaSheet from '../../components/RefinarBusquedaSheet';
import Screen from '../../components/Screen';
import { CardSkeleton, EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import { SEARCH_PAGE_SIZE } from '../../config/constants';
import { colors, spacing, typography } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { crearAlerta } from '../../services/alertasService';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { guardarResultados, obtenerResultadosGuardados } from '../../services/offline/resultadosCache';
import { buscarPublicaciones } from '../../services/publicacionesService';
import { claveDeFiltros, criteriosDeFiltros, haversineKm, usaUbicacion } from '../../utils/busqueda';
import { formatFechaHora, formatHaceCuanto } from '../../utils/publicacionFormatters';

// Listado paginado + refinar + ordenar (Punto 3). Estados excluyentes: cargando (esqueleto)
// -> error (con reintentar) -> vacío (con acciones) -> lista. "Cercanos" necesita la
// ubicación de la persona: si los filtros no la traen, se pide al tocar el orden.
// Sin conexión, Refinar y Cercanos se deshabilitan (Punto 6): ambos son una búsqueda nueva
// en el backend, y rehacerlos sobre la primera página guardada (≤ SEARCH_PAGE_SIZE ítems)
// daría un resultado parcial que parece completo.
export default function ResultadosScreen({ route, navigation }) {
  const toast = useToast();
  const { sinConexion } = useConnectivity();
  const [filtros, setFiltros] = useState(route.params.filtros);
  const [barrioNombre, setBarrioNombre] = useState(route.params.barrioNombre ?? null);
  const [orden, setOrden] = useState(usaUbicacion(route.params.filtros) ? 'cercanos' : 'recientes');
  // Ubicación pedida solo para ordenar por cercanía (cuando los filtros no traen una).
  const [ubicacionOrden, setUbicacionOrden] = useState(null);
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [guardandoAlerta, setGuardandoAlerta] = useState(false);
  // Clave de la búsqueda para la que ya se guardó la alerta: al cambiar los filtros deja de coincidir.
  const [alertaGuardadaPara, setAlertaGuardadaPara] = useState(null);
  // Punto 6: no-null cuando lo que se muestra viene del caché (sin conexión, o la request
  // falló por red) — { coincide, resumen, cacheadoEn }. Desactiva la paginación (no tiene
  // sentido pedir "más" de un snapshot fijo) y muestra el aviso con la hora.
  const [cache, setCache] = useState(null);
  const pedido = useRef(0); // descarta respuestas de una búsqueda que ya quedó vieja

  // Si se navega a Resultados con otros filtros estando ya abierta (p. ej. tocar una alerta),
  // la pantalla no se remonta: se reinicia el estado al cambiar los params.
  const [filtrosRuta, setFiltrosRuta] = useState(route.params.filtros);
  if (route.params.filtros !== filtrosRuta) {
    setFiltrosRuta(route.params.filtros);
    setFiltros(route.params.filtros);
    setBarrioNombre(route.params.barrioNombre ?? null);
    setOrden(usaUbicacion(route.params.filtros) ? 'cercanos' : 'recientes');
    setUbicacionOrden(null);
    setItems([]);
    setPage(0);
    setCache(null);
    setError('');
    setLoading(true);
  }

  const {
    cargando: cargandoUbicacion,
    error: errorUbicacion,
    obtenerUbicacion,
    limpiarUbicacion,
  } = useUbicacionActual();

  const esExplorar = filtros.tipoBuscado === 'todos';
  const alertaGuardada = alertaGuardadaPara === claveDeFiltros(filtros);
  const puedeAlerta = !esExplorar;

  // Coordenadas vigentes: las de los filtros, o las pedidas para ordenar por cercanía.
  const coords = usaUbicacion(filtros)
    ? { lat: filtros.lat, lng: filtros.lng }
    : orden === 'cercanos'
      ? ubicacionOrden
      : null;

  // Lo que se manda al backend y se usa como clave del caché offline.
  const consulta = useMemo(
    () => ({ ...filtros, lat: coords?.lat, lng: coords?.lng }),
    [filtros, coords?.lat, coords?.lng]
  );

  const cargarDesdeCache = useCallback(
    async (id, mensajeSiNoHay) => {
      const guardado = await obtenerResultadosGuardados(consulta, orden);
      if (id !== pedido.current) return;
      if (guardado) {
        setItems(guardado.data);
        setTotal(guardado.total);
        setPage(0);
        setCache({ coincide: guardado.coincide, resumen: guardado.resumen, cacheadoEn: guardado.cacheadoEn });
        setError('');
      } else {
        setItems([]);
        setTotal(0);
        setCache(null);
        setError(mensajeSiNoHay);
      }
    },
    [consulta, orden]
  );

  const cargarPagina = useCallback(
    async (pageNum, append) => {
      const id = ++pedido.current;
      try {
        if (append) setLoadingMore(true);
        else if (!refreshing) setLoading(true);
        if (sinConexion) {
          await cargarDesdeCache(id, 'No hay conexión y todavía no guardamos resultados de una búsqueda anterior.');
          return;
        }
        const resultado = await buscarPublicaciones({ ...consulta, orden, page: pageNum, size: SEARCH_PAGE_SIZE });
        if (id !== pedido.current) return;
        setItems((actuales) => (append ? [...actuales, ...resultado.data] : resultado.data));
        setTotal(resultado.total);
        setPage(resultado.page);
        setError('');
        setCache(null);
        // Solo la primera página de cada búsqueda: alcanza con "los últimos resultados
        // cargados", no hace falta cachear todo el scroll acumulado de "cargar más".
        if (!append) guardarResultados({ filtros: consulta, orden, data: resultado.data, total: resultado.total });
      } catch (e) {
        if (id !== pedido.current) return;
        if (esErrorDeRed(e)) {
          if (append) {
            toast.error(getErrorMessage(e));
          } else {
            await cargarDesdeCache(id, getErrorMessage(e));
          }
          return;
        }
        if (append) toast.error(getErrorMessage(e));
        else {
          setItems([]);
          setTotal(0);
          setError(getErrorMessage(e));
        }
      } finally {
        if (id === pedido.current) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [consulta, orden, sinConexion, cargarDesdeCache, refreshing, toast]
  );

  // Una búsqueda nueva cada vez que cambian los criterios, el orden o la conexión.
  useEffect(() => {
    let vigente = true;
    Promise.resolve().then(() => vigente && cargarPagina(0, false));
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consulta, orden, sinConexion]);

  const reintentar = () => cargarPagina(0, false);

  const refrescar = () => {
    setRefreshing(true);
    cargarPagina(0, false);
  };

  const pedirSiguientePagina = () => {
    if (loadingMore || loading || cache || error) return;
    if (items.length >= total) return;
    cargarPagina(page + 1, true);
  };

  const elegirRecientes = () => setOrden('recientes');

  const elegirCercanos = async () => {
    if (sinConexion) {
      toast.info('Necesitás conexión para ordenar por cercanía.');
      return;
    }
    if (coords || usaUbicacion(filtros)) {
      setOrden('cercanos');
      return;
    }
    const obtenidas = await obtenerUbicacion();
    if (obtenidas) {
      setUbicacionOrden(obtenidas);
      setOrden('cercanos');
    }
  };

  const aplicarFiltros = (nuevosFiltros, nombreBarrio) => {
    setFiltros(nuevosFiltros);
    setBarrioNombre(nombreBarrio);
    setSheetVisible(false);
    if (orden === 'cercanos' && !usaUbicacion(nuevosFiltros) && !ubicacionOrden) setOrden('recientes');
    if (usaUbicacion(nuevosFiltros)) setOrden('cercanos');
  };

  const guardarComoAlerta = async () => {
    if (sinConexion) {
      toast.info('Necesitás conexión para guardar una alerta.');
      return;
    }
    if (!puedeAlerta) {
      toast.info('Para crear una alerta elegí si perdiste o encontraste algo (en Refinar).');
      return;
    }
    setGuardandoAlerta(true);
    try {
      await crearAlerta({
        tipoBuscado: filtros.tipoBuscado,
        categoria: filtros.categoria,
        texto: filtros.texto,
        barrioId: filtros.barrioId,
      });
      setAlertaGuardadaPara(claveDeFiltros(filtros));
      toast.success('Alerta guardada. Te avisamos cuando aparezca algo parecido.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setGuardandoAlerta(false);
    }
  };

  // Precarga el wizard de publicar con lo que la persona ya tipeó acá. tipoBuscado es
  // literalmente "perdí/encontré", el mismo valor que el wizard espera como "tipo".
  const irAPublicar = () => {
    const params = {};
    if (!esExplorar) params.tipo = filtros.tipoBuscado;
    if (filtros.categoria) params.categoria = filtros.categoria;
    if (filtros.barrioId) params.barrioId = filtros.barrioId;
    navigation.navigate('Publicar', { screen: 'PublicarWizard', params });
  };

  const criterios = criteriosDeFiltros(filtros, barrioNombre);
  const mostrandoLista = !loading && !error && items.length > 0;
  const hayMas = items.length < total;

  const encabezado = (
    <View style={styles.encabezado}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.criterios}>
        {criterios.map((c) => (
          <Chip key={c.key} label={c.label} icon={c.icon} tone="primary" />
        ))}
      </ScrollView>

      <View style={styles.fila}>
        <Text style={styles.contador} accessibilityRole="header" numberOfLines={1}>
          {loading ? 'Buscando…' : error ? 'Resultados' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}
        </Text>
        <View style={styles.acciones}>
          {puedeAlerta ? (
            <Button
              title={alertaGuardada ? 'Alerta activa' : 'Alerta'}
              icon={alertaGuardada ? 'notifications' : 'notifications-outline'}
              variant="secondary"
              size="sm"
              onPress={guardarComoAlerta}
              loading={guardandoAlerta}
              disabled={alertaGuardada || sinConexion}
            />
          ) : null}
          <Button
            title="Refinar"
            icon="options-outline"
            variant="secondary"
            size="sm"
            onPress={() => setSheetVisible(true)}
            disabled={sinConexion}
          />
        </View>
      </View>

      <View style={styles.orden}>
        <Text style={styles.ordenLabel}>Ordenar por</Text>
        <Chip label="Recientes" icon="time-outline" selected={orden === 'recientes'} onPress={elegirRecientes} size="md" />
        <Chip
          label={cargandoUbicacion ? 'Buscando…' : 'Cercanos'}
          icon="locate-outline"
          selected={orden === 'cercanos'}
          onPress={elegirCercanos}
          style={sinConexion ? styles.deshabilitado : undefined}
        />
      </View>

      {sinConexion ? (
        <Text style={styles.aviso}>Necesitás conexión para refinar, ordenar por cercanía o crear alertas.</Text>
      ) : null}

      {errorUbicacion?.tipo === 'permiso' ? (
        <View style={styles.permiso}>
          <PermisoDenegado
            icon="location-outline"
            titulo="Necesitamos tu ubicación"
            motivo="Para ordenar por cercanía necesitamos saber dónde estás. Habilitá el permiso en la configuración."
          />
          <Button title="Ahora no" variant="ghost" size="sm" onPress={limpiarUbicacion} />
        </View>
      ) : errorUbicacion ? (
        <InlineMessage tone="warning" message={errorUbicacion.mensaje} />
      ) : null}

      {cache ? (
        <InlineMessage
          tone="warning"
          message={
            cache.coincide
              ? `Sin conexión: mostramos los resultados guardados el ${formatFechaHora(new Date(cache.cacheadoEn).toISOString())} (${formatHaceCuanto(cache.cacheadoEn)}). Pueden estar desactualizados.`
              : `Sin resultados guardados para esta búsqueda. Mostramos los de tu última búsqueda con conexión (${cache.resumen}), guardados el ${formatFechaHora(new Date(cache.cacheadoEn).toISOString())}. Pueden estar desactualizados.`
          }
        />
      ) : null}
    </View>
  );

  // Lo que se ve cuando no hay lista: esqueleto, error o vacío (uno solo a la vez).
  const estadoSinLista = loading ? (
    <CardSkeleton count={4} />
  ) : error ? (
    <ErrorState
      title="No pudimos cargar los resultados"
      message={error}
      onRetry={reintentar}
      retrying={refreshing}
    />
  ) : (
    <EmptyState
      title="No encontramos publicaciones"
      message={
        puedeAlerta
          ? 'Probá sacando algún filtro, o guardá la búsqueda como alerta y te avisamos cuando aparezca algo.'
          : 'Todavía no hay publicaciones con estos filtros. Probá con otros.'
      }
      actionLabel={esExplorar ? 'Publicar algo' : filtros.tipoBuscado === 'perdido' ? 'Publicar mi pérdida' : 'Publicar mi hallazgo'}
      onAction={irAPublicar}
      secondaryLabel={puedeAlerta ? (alertaGuardada ? 'Alerta guardada' : 'Guardar como alerta') : undefined}
      onSecondary={alertaGuardada ? undefined : guardarComoAlerta}
    />
  );

  const pie = mostrandoLista ? (
    <View style={styles.pie}>
      {loadingMore ? <ActivityIndicator color={colors.primary} style={styles.cargandoMas} /> : null}
      {!hayMas && !cache ? <Text style={styles.finLista}>No hay más resultados</Text> : null}
      {cache ? <Text style={styles.finLista}>Mostramos solo los resultados guardados</Text> : null}
      {puedeAlerta && !hayMas ? (
        <Card style={styles.alertaCard}>
          <Ionicons name="notifications-outline" size={26} color={colors.primary} />
          <View style={styles.alertaTextos}>
            <Text style={styles.alertaTitulo}>¿No encontrás lo tuyo?</Text>
            <Text style={styles.alertaTexto}>Guardá esta búsqueda y te avisamos cuando aparezca algo parecido.</Text>
          </View>
          <Button
            title={alertaGuardada ? 'Guardada' : 'Guardar'}
            variant="secondary"
            size="sm"
            onPress={guardarComoAlerta}
            loading={guardandoAlerta}
            disabled={alertaGuardada || sinConexion}
          />
        </Card>
      ) : null}
    </View>
  ) : null;

  return (
    <Screen scroll={false}>
      <FlatList
        data={mostrandoLista ? items : []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PublicationCard
            publicacion={item}
            distanciaKm={coords ? haversineKm(coords.lat, coords.lng, item.lat, item.lng) : undefined}
            onPress={() => navigation.navigate('DetallePublicacion', { id: item.id })}
          />
        )}
        ListHeaderComponent={encabezado}
        ListEmptyComponent={estadoSinLista}
        ListFooterComponent={pie}
        contentContainerStyle={styles.lista}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReachedThreshold={0.4}
        onEndReached={pedirSiguientePagina}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refrescar}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      <RefinarBusquedaSheet
        visible={sheetVisible}
        filtros={filtros}
        barrioNombre={barrioNombre}
        puedeCambiarTipo={esExplorar || route.params.filtros.tipoBuscado === 'todos'}
        onClose={() => setSheetVisible(false)}
        onAplicar={aplicarFiltros}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  encabezado: {
    gap: spacing.md - 4,
  },
  criterios: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  contador: {
    ...typography.heading,
    flexShrink: 1,
  },
  acciones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  orden: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ordenLabel: {
    ...typography.label,
  },
  deshabilitado: {
    opacity: 0.45,
  },
  aviso: {
    ...typography.caption,
  },
  permiso: {
    gap: spacing.xs,
  },
  pie: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  cargandoMas: {
    marginVertical: spacing.md,
  },
  finLista: {
    ...typography.caption,
    textAlign: 'center',
  },
  alertaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
  },
  alertaTextos: {
    flex: 1,
    gap: 2,
  },
  alertaTitulo: {
    ...typography.subheading,
  },
  alertaTexto: {
    ...typography.caption,
  },
});
