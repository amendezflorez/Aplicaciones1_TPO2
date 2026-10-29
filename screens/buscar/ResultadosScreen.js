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
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { crearAlerta } from '../../services/alertasService';
import { getErrorMessage } from '../../services/errors';
import { buscarPublicaciones } from '../../services/publicacionesService';
import { getBarrios } from '../../services/userService';

// Listado paginado + refinar + ordenar (sección 4.2 del plan). "cercanos" solo se habilita
// si los filtros activos ya traen lat/lng (se usó ubicación en el buscador o al refinar).
export default function ResultadosScreen({ route, navigation }) {
  const [filtros, setFiltros] = useState(route.params.filtros);
  const [orden, setOrden] = useState('recientes');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [refineVisible, setRefineVisible] = useState(false);

  const tieneUbicacion = filtros.lat != null && filtros.lng != null;

  const cargarPagina = useCallback(
    async (pageNum, append) => {
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
      } catch (e) {
        setError(getErrorMessage(e));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filtros, orden]
  );

  useEffect(() => {
    cargarPagina(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, orden]);

  const pedirSiguientePagina = () => {
    if (loadingMore || loading) return;
    if (items.length >= total) return;
    cargarPagina(page + 1, true);
  };

  const cambiarOrden = (nuevoOrden) => {
    if (nuevoOrden === 'cercanos' && !tieneUbicacion) return;
    setOrden(nuevoOrden);
  };

  const guardarComoAlerta = async () => {
    try {
      await crearAlerta(filtros);
      Alert.alert('Listo', 'Guardamos esta búsqueda como alerta. Te vamos a avisar de novedades.');
    } catch (e) {
      Alert.alert('No se pudo guardar', getErrorMessage(e));
    }
  };

  const irAPublicar = () => {
    // Punto 5 (alta de publicación) todavía no existe en este plan — ver sección 0.
    Alert.alert('Próximamente', 'Esta pantalla va a estar disponible cuando esté lista "Mi publicación".');
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
          <Button title="Guardar esta búsqueda como alerta" variant="secondary" onPress={guardarComoAlerta} />
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
  const { ubicacion, cargando, permisoDenegado, obtenerUbicacion } = useUbicacionActual();

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
            permisoDenegado={permisoDenegado}
            onUsarUbicacion={usarUbicacion}
            onQuitarUbicacion={() => setUbicacionActiva(false)}
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
