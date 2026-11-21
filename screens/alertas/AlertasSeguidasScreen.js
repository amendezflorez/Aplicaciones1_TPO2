import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AlertaCard from '../../components/AlertaCard';
import Button from '../../components/Button';
import EstadoChip from '../../components/EstadoChip';
import OfflineBanner from '../../components/OfflineBanner';
import PublicationCard from '../../components/PublicationCard';
import SegmentedTabs from '../../components/SegmentedTabs';
import { CardSkeleton, EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { borrarAlerta, getAlertas, pausarAlerta, revisarAlerta } from '../../services/alertasService';
import { getErrorMessage } from '../../services/errors';
import {
  dejarDeSeguirPublicacion,
  getSeguidas,
  marcarSeguimientoVisto,
} from '../../services/seguimientosService';

// Punto 9: "Mis alertas" (búsquedas guardadas) y "Seguidas" (publicaciones seguidas), cada
// una con su propio estado de carga/error para que una falla no esconda a la otra.
const ESTADO_INICIAL = { data: [], loading: true, error: '' };
const POLL_MS = 30000;

export default function AlertasSeguidasScreen({ navigation }) {
  const { sinConexion } = useConnectivity();
  const toast = useToast();
  const [vista, setVista] = useState('alertas'); // 'alertas' | 'seguidas'
  const [alertas, setAlertas] = useState(ESTADO_INICIAL);
  const [seguidas, setSeguidas] = useState(ESTADO_INICIAL);
  const [refreshing, setRefreshing] = useState(false);
  // ids con una acción en curso (pausar/eliminar/dejar de seguir)
  const [ocupados, setOcupados] = useState({});
  const cargados = useRef({ alertas: false, seguidas: false });

  const marcarOcupado = (id, valor) =>
    setOcupados((prev) => {
      const next = { ...prev };
      if (valor) next[id] = true;
      else delete next[id];
      return next;
    });

  // silencioso = refresco automático en segundo plano: si ya hay datos y falla, se
  // conservan (no se pisa la lista con un error); sin datos, sí se muestra el error.
  const cargarSegmento = useCallback(async (clave, fetcher, setEstado, { silencioso = false } = {}) => {
    if (!silencioso && !cargados.current[clave]) setEstado((s) => ({ ...s, loading: true }));
    try {
      const data = await fetcher();
      cargados.current[clave] = true;
      setEstado({ data: data ?? [], loading: false, error: '' });
    } catch (e) {
      setEstado((s) =>
        silencioso && cargados.current[clave]
          ? s
          : { data: cargados.current[clave] ? s.data : [], loading: false, error: getErrorMessage(e) }
      );
      if (!silencioso && cargados.current[clave]) toast.error(getErrorMessage(e));
    }
  }, [toast]);

  const cargarAlertas = useCallback(
    (opts) => cargarSegmento('alertas', getAlertas, setAlertas, opts),
    [cargarSegmento]
  );
  const cargarSeguidas = useCallback(
    (opts) => cargarSegmento('seguidas', getSeguidas, setSeguidas, opts),
    [cargarSegmento]
  );

  useFocusEffect(
    useCallback(() => {
      cargarAlertas();
      cargarSeguidas();
      const interval = setInterval(() => {
        cargarAlertas({ silencioso: true });
        cargarSeguidas({ silencioso: true });
      }, POLL_MS);
      return () => clearInterval(interval);
    }, [cargarAlertas, cargarSeguidas])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await (vista === 'alertas' ? cargarAlertas() : cargarSeguidas());
    setRefreshing(false);
  };

  // ---------- Alertas ----------
  const handleTogglePausa = async (alerta) => {
    if (sinConexion) return;
    const pausar = !alerta.pausada;
    marcarOcupado(alerta.id, true);
    try {
      const actualizada = await pausarAlerta(alerta.id, pausar);
      setAlertas((s) => ({
        ...s,
        data: s.data.map((a) => (a.id === alerta.id ? { ...a, ...actualizada } : a)),
      }));
      toast.success(pausar ? 'Alerta pausada. No vas a recibir avisos.' : 'Alerta activada. Te vamos a avisar de novedades.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      marcarOcupado(alerta.id, false);
    }
  };

  const handleEliminarAlerta = (alerta) => {
    if (sinConexion) return;
    Alert.alert(
      'Eliminar alerta',
      'No vas a recibir más avisos de esta búsqueda. ¿Querés eliminarla?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            marcarOcupado(alerta.id, true);
            try {
              await borrarAlerta(alerta.id);
              setAlertas((s) => ({ ...s, data: s.data.filter((a) => a.id !== alerta.id) }));
              toast.success('Alerta eliminada.');
            } catch (e) {
              toast.error(getErrorMessage(e));
            } finally {
              marcarOcupado(alerta.id, false);
            }
          },
        },
      ]
    );
  };

  // Tocar una alerta ejecuta su búsqueda y la marca como revisada (el contador vuelve a 0).
  const handleVerAlerta = (alerta) => {
    if (!alerta.pausada && alerta.novedadesCount > 0) {
      setAlertas((s) => ({
        ...s,
        data: s.data.map((a) => (a.id === alerta.id ? { ...a, novedadesCount: 0 } : a)),
      }));
      revisarAlerta(alerta.id).catch((e) => {
        toast.error(getErrorMessage(e));
        cargarAlertas({ silencioso: true });
      });
    }
    const filtros = { tipoBuscado: alerta.tipoBuscado };
    if (alerta.categoria) filtros.categoria = alerta.categoria;
    if (alerta.barrio?.id) filtros.barrioId = alerta.barrio.id;
    if (alerta.texto) filtros.texto = alerta.texto;
    navigation.navigate('Buscar', { screen: 'Resultados', params: { filtros } });
  };

  // ---------- Seguidas ----------
  const handleVerSeguimiento = (item) => {
    if (item.cambioEstado) {
      setSeguidas((s) => ({
        ...s,
        data: s.data.map((x) =>
          x.id === item.id ? { ...x, cambioEstado: false, ultimoEstadoVisto: item.estado } : x
        ),
      }));
      marcarSeguimientoVisto(item.id).catch((e) => {
        toast.error(getErrorMessage(e));
        cargarSeguidas({ silencioso: true });
      });
    }
    navigation.navigate('Buscar', { screen: 'DetallePublicacion', params: { id: item.id } });
  };

  const handleDejarDeSeguir = (item) => {
    if (sinConexion) return;
    Alert.alert('Dejar de seguir', `¿Dejar de seguir "${item.titulo}"? Ya no te avisamos si cambia de estado.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Dejar de seguir',
        style: 'destructive',
        onPress: async () => {
          marcarOcupado(item.id, true);
          try {
            await dejarDeSeguirPublicacion(item.id);
            setSeguidas((s) => ({ ...s, data: s.data.filter((x) => x.id !== item.id) }));
            toast.success('Dejaste de seguir la publicación.');
          } catch (e) {
            toast.error(getErrorMessage(e));
          } finally {
            marcarOcupado(item.id, false);
          }
        },
      },
    ]);
  };

  const novedadesAlertas = alertas.data.reduce(
    (sum, a) => sum + (!a.pausada && a.novedadesCount ? a.novedadesCount : 0),
    0
  );
  const novedadesSeguidas = seguidas.data.filter((s) => s.cambioEstado).length;

  const opciones = [
    { id: 'alertas', label: 'Mis alertas', count: alertas.data.length, badge: novedadesAlertas },
    { id: 'seguidas', label: 'Seguidas', count: seguidas.data.length, badge: novedadesSeguidas },
  ];

  const estado = vista === 'alertas' ? alertas : seguidas;
  const reintentar = () => (vista === 'alertas' ? cargarAlertas() : cargarSeguidas());

  const listaProps = {
    contentContainerStyle: styles.lista,
    ItemSeparatorComponent: Separador,
    showsVerticalScrollIndicator: false,
    refreshControl: (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        colors={[colors.primary]}
        tintColor={colors.primary}
      />
    ),
  };

  let contenido;
  if (estado.loading) {
    contenido = (
      <View style={styles.lista}>
        <CardSkeleton count={3} />
      </View>
    );
  } else if (estado.error) {
    contenido = (
      <ErrorState
        title={vista === 'alertas' ? 'No pudimos cargar tus alertas' : 'No pudimos cargar tus seguidas'}
        message={estado.error}
        onRetry={reintentar}
      />
    );
  } else if (vista === 'alertas') {
    contenido = (
      <FlatList
        {...listaProps}
        data={alertas.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AlertaCard
            alerta={item}
            busy={!!ocupados[item.id]}
            disabled={sinConexion}
            onPress={() => handleVerAlerta(item)}
            onTogglePausa={() => handleTogglePausa(item)}
            onEliminar={() => handleEliminarAlerta(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="notifications-outline"
            title="Todavía no tenés alertas"
            message="Guardá una búsqueda como alerta desde los resultados y te avisamos cuando alguien publique algo que coincida."
            actionLabel="Ir a Buscar"
            onAction={() => navigation.navigate('Buscar')}
          />
        }
      />
    );
  } else {
    contenido = (
      <FlatList
        {...listaProps}
        data={seguidas.data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SeguidaItem
            item={item}
            busy={!!ocupados[item.id]}
            sinConexion={sinConexion}
            onPress={() => handleVerSeguimiento(item)}
            onDejarDeSeguir={() => handleDejarDeSeguir(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="bookmark-outline"
            title="No seguís ninguna publicación"
            message={'Tocá "Seguir" en el detalle de una publicación y te avisamos si cambia de estado.'}
            actionLabel="Explorar publicaciones"
            onAction={() => navigation.navigate('Buscar')}
          />
        }
      />
    );
  }

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.cabecera}>
        <SegmentedTabs options={opciones} value={vista} onChange={setVista} />
        {sinConexion ? (
          <InlineMessage
            tone="info"
            message="Sin conexión: no podés pausar, eliminar ni dejar de seguir hasta que vuelva internet."
          />
        ) : null}
      </View>
      {contenido}
    </View>
  );
}

function Separador() {
  return <View style={{ height: spacing.md }} />;
}

// Publicación seguida: la tarjeta normal + aviso "Cambió de estado" cuando hay novedad.
function SeguidaItem({ item, busy, sinConexion, onPress, onDejarDeSeguir }) {
  return (
    <View style={styles.seguida}>
      {item.cambioEstado ? (
        <View style={styles.cambio}>
          <View style={styles.cambioIcon}>
            <Ionicons name="sync" size={14} color={colors.white} />
          </View>
          <Text style={styles.cambioText}>Antes</Text>
          {item.ultimoEstadoVisto ? <EstadoChip estado={item.ultimoEstadoVisto} /> : null}
          <Ionicons name="arrow-forward" size={14} color="#B8411F" />
          <Text style={styles.cambioText}>Ahora</Text>
          <EstadoChip estado={item.estado} />
        </View>
      ) : null}
      <PublicationCard publicacion={item} onPress={onPress} />
      <Button
        title="Dejar de seguir"
        icon="bookmark"
        variant="ghost"
        size="sm"
        onPress={onDejarDeSeguir}
        loading={busy}
        disabled={sinConexion}
        style={styles.dejar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  cabecera: {
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  lista: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  seguida: {
    gap: spacing.xs,
  },
  cambio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md - 4,
  },
  cambioIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cambioText: {
    ...typography.label,
    color: '#B8411F',
    fontWeight: '800',
  },
  dejar: {
    alignSelf: 'flex-end',
  },
});
