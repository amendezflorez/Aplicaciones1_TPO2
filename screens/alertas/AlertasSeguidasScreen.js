import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AlertaCard from '../../components/AlertaCard';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import OfflineBanner from '../../components/OfflineBanner';
import PublicationCard from '../../components/PublicationCard';
import { colors, radius, spacing } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { borrarAlerta, getAlertas, pausarAlerta, revisarAlerta } from '../../services/alertasService';
import { getErrorMessage } from '../../services/errors';
import {
  dejarDeSeguirPublicacion,
  getSeguidas,
  marcarSeguimientoVisto,
} from '../../services/seguimientosService';

export default function AlertasSeguidasScreen({ navigation }) {
  const { sinConexion } = useConnectivity();
  const [vista, setVista] = useState('alertas'); // 'alertas' | 'seguidas'

  const [alertas, setAlertas] = useState([]);
  const [seguidas, setSeguidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const cargarDatos = useCallback(async () => {
    try {
      setError('');
      const [alertasData, seguidasData] = await Promise.all([
        getAlertas().catch((e) => {
          // Si falla de red offline, no bloquear
          return [];
        }),
        getSeguidas().catch((e) => {
          return [];
        }),
      ]);
      setAlertas(alertasData || []);
      setSeguidas(seguidasData || []);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargarDatos();
      const interval = setInterval(cargarDatos, 30000);
      return () => clearInterval(interval);
    }, [cargarDatos])
  );

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const handleTogglePausa = async (alerta) => {
    if (sinConexion) {
      Alert.alert('Sin conexión', 'Necesitás conexión para pausar o reanudar alertas.');
      return;
    }
    const nuevoEstado = !alerta.pausada;
    // Actualización optimista
    setAlertas((prev) =>
      prev.map((a) => (a.id === alerta.id ? { ...a, pausada: nuevoEstado, novedadesCount: nuevoEstado ? 0 : a.novedadesCount } : a))
    );
    try {
      await pausarAlerta(alerta.id, nuevoEstado);
    } catch (e) {
      cargarDatos();
      Alert.alert('Error', getErrorMessage(e));
    }
  };

  const handleEliminarAlerta = (alerta) => {
    if (sinConexion) {
      Alert.alert('Sin conexión', 'Necesitás conexión para eliminar alertas.');
      return;
    }
    Alert.alert(
      'Eliminar alerta',
      '¿Seguro que querés eliminar esta alerta? No volverás a recibir novedades de esta búsqueda.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setAlertas((prev) => prev.filter((a) => a.id !== alerta.id));
            try {
              await borrarAlerta(alerta.id);
            } catch (e) {
              cargarDatos();
              Alert.alert('Error', getErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const handleVerAlerta = async (alerta) => {
    if (!alerta.pausada && alerta.novedadesCount > 0) {
      // Reiniciar contador de novedades en backend
      revisarAlerta(alerta.id).catch(() => {});
      setAlertas((prev) =>
        prev.map((a) => (a.id === alerta.id ? { ...a, novedadesCount: 0 } : a))
      );
    }
    navigation.navigate('Buscar', {
      screen: 'Resultados',
      params: {
        filtros: {
          tipoBuscado: alerta.tipoBuscado,
          categoria: alerta.categoria,
          barrioId: alerta.barrio?.id,
          texto: alerta.texto,
        },
      },
    });
  };

  const handleVerSeguimiento = async (item) => {
    if (item.cambioEstado) {
      marcarSeguimientoVisto(item.id).catch(() => {});
      setSeguidas((prev) =>
        prev.map((s) => (s.id === item.id ? { ...s, cambioEstado: false, ultimoEstadoVisto: item.estado } : s))
      );
    }
    navigation.navigate('Buscar', {
      screen: 'DetallePublicacion',
      params: { id: item.id },
    });
  };

  const handleDejarDeSeguir = (item) => {
    if (sinConexion) {
      Alert.alert('Sin conexión', 'Necesitás conexión para dejar de seguir publicaciones.');
      return;
    }
    Alert.alert(
      'Dejar de seguir',
      `¿Dejar de seguir "${item.titulo}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dejar de seguir',
          style: 'destructive',
          onPress: async () => {
            setSeguidas((prev) => prev.filter((s) => s.id !== item.id));
            try {
              await dejarDeSeguirPublicacion(item.id);
            } catch (e) {
              cargarDatos();
              Alert.alert('Error', getErrorMessage(e));
            }
          },
        },
      ]
    );
  };

  const totalNovedadesAlertas = alertas.reduce(
    (sum, a) => sum + (!a.pausada && a.novedadesCount ? a.novedadesCount : 0),
    0
  );
  const totalNovedadesSeguidas = seguidas.filter((s) => s.cambioEstado).length;

  return (
    <View style={styles.container}>
      <OfflineBanner />
      {sinConexion ? (
        <Text style={styles.avisoSinConexion}>
          Estás sin conexión. Las acciones para pausar, eliminar o seguir requieren internet.
        </Text>
      ) : null}

      {/* Tabs segmentadas */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, vista === 'alertas' && styles.tabSelected]}
          onPress={() => setVista('alertas')}
          accessibilityRole="tab"
          accessibilityState={{ selected: vista === 'alertas' }}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, vista === 'alertas' && styles.tabTextSelected]}>
              Mis alertas ({alertas.length})
            </Text>
            {totalNovedadesAlertas > 0 ? (
              <View style={styles.badgeIndicador}>
                <Text style={styles.badgeIndicadorText}>{totalNovedadesAlertas}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, vista === 'seguidas' && styles.tabSelected]}
          onPress={() => setVista('seguidas')}
          accessibilityRole="tab"
          accessibilityState={{ selected: vista === 'seguidas' }}
        >
          <View style={styles.tabContent}>
            <Text style={[styles.tabText, vista === 'seguidas' && styles.tabTextSelected]}>
              Seguidas ({seguidas.length})
            </Text>
            {totalNovedadesSeguidas > 0 ? (
              <View style={styles.badgeIndicador}>
                <Text style={styles.badgeIndicadorText}>{totalNovedadesSeguidas}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
      </View>

      <ErrorText message={error} />

      {loading && !refreshing ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : vista === 'alertas' ? (
        <FlatList
          data={alertas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, !alertas.length && styles.emptyList]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <AlertaCard
              alerta={item}
              onPress={() => handleVerAlerta(item)}
              onTogglePausa={() => handleTogglePausa(item)}
              onEliminar={() => handleEliminarAlerta(item)}
              disabled={sinConexion}
            />
          )}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioIcono}>🔔</Text>
              <Text style={styles.vacioTitulo}>Sin alertas creadas</Text>
              <Text style={styles.vacioTexto}>
                Al realizar una búsqueda podés guardarla como alerta para enterarte al instante cuando alguien publique lo que buscás.
              </Text>
              <Button
                title="Ir al buscador"
                onPress={() => navigation.navigate('Buscar')}
                style={styles.botonVacio}
              />
            </View>
          }
        />
      ) : (
        <FlatList
          data={seguidas}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, !seguidas.length && styles.emptyList]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          renderItem={({ item }) => (
            <View style={styles.seguidaItem}>
              <PublicationCard publicacion={item} onPress={() => handleVerSeguimiento(item)} />
              <TouchableOpacity
                style={styles.botonDejarDeSeguir}
                onPress={() => handleDejarDeSeguir(item)}
                disabled={sinConexion}
              >
                <Text style={styles.botonDejarDeSeguirText}>Dejar de seguir</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioIcono}>📌</Text>
              <Text style={styles.vacioTitulo}>No seguís publicaciones</Text>
              <Text style={styles.vacioTexto}>
                {'Entrá al detalle de cualquier publicación y tocá "Seguir" para enterarte si cambia de estado (en reclamo o resuelta).'}
              </Text>
              <Button
                title="Explorar publicaciones"
                onPress={() => navigation.navigate('Buscar')}
                style={styles.botonVacio}
              />
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  avisoSinConexion: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
    backgroundColor: '#FEF3C7',
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabSelected: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tabText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '600',
  },
  tabTextSelected: {
    color: colors.primary,
  },
  badgeIndicador: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.round,
  },
  badgeIndicadorText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    padding: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  centrado: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seguidaItem: {
    gap: 4,
  },
  botonDejarDeSeguir: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  botonDejarDeSeguirText: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
  vacio: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  vacioIcono: {
    fontSize: 48,
  },
  vacioTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  vacioTexto: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  botonVacio: {
    marginTop: spacing.sm,
  },
});
