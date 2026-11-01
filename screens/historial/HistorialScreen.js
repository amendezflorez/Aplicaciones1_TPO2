import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import CasoHistorialCard from '../../components/CasoHistorialCard';
import ErrorText from '../../components/ErrorText';
import Loading from '../../components/Loading';
import OfflineBanner from '../../components/OfflineBanner';
import Screen from '../../components/Screen';
import { colors, radius, spacing } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { getHistorial } from '../../services/historialService';
import ValorarModal from './ValorarModal';

const FILTROS_TIPO = [
  { id: 'todos', label: 'Todos' },
  { id: 'devolvi', label: 'Devolví' },
  { id: 'recupere', label: 'Recuperé' },
];

const FILTROS_FECHA = [
  { id: 'todas', label: 'Cualquier fecha', dias: null },
  { id: '7d', label: 'Últimos 7 días', dias: 7 },
  { id: '30d', label: 'Último mes', dias: 30 },
];

export default function HistorialScreen({ navigation }) {
  const { sinConexion } = useConnectivity();
  const [tipo, setTipo] = useState('todos');
  const [fechaFiltro, setFechaFiltro] = useState('todas');
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [casoAValorar, setCasoAValorar] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (tipo !== 'todos') params.tipo = tipo;

      const filtroDias = FILTROS_FECHA.find((f) => f.id === fechaFiltro)?.dias;
      if (filtroDias) {
        params.desde = new Date(Date.now() - filtroDias * 24 * 60 * 60 * 1000).toISOString();
      }

      const res = await getHistorial(params);
      setCasos(res);
    } catch (e) {
      if (!esErrorDeRed(e)) setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [tipo, fechaFiltro]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const irAlPerfil = (userId) => {
    navigation.navigate('PublicProfile', { userId });
  };

  const handleValorado = (casoActualizado) => {
    setCasos((prev) =>
      prev.map((c) => (c.id === casoActualizado.id ? casoActualizado : c))
    );
  };

  return (
    <Screen>
      <OfflineBanner />

      <View style={styles.tabsContainer}>
        {FILTROS_TIPO.map((tab) => {
          const count =
            tab.id === 'todos'
              ? casos.length
              : casos.filter((c) => c.tipo === tab.id).length;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, tipo === tab.id && styles.tabActiva]}
              onPress={() => setTipo(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabTexto, tipo === tab.id && styles.tabTextoActivo]}>
                {tab.label} {count > 0 ? `(${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.filtrosFechaContainer}>
        <Text style={styles.filtroFechaLabel}>Fecha:</Text>
        {FILTROS_FECHA.map((filtro) => (
          <TouchableOpacity
            key={filtro.id}
            style={[styles.chipFecha, fechaFiltro === filtro.id && styles.chipFechaActivo]}
            onPress={() => setFechaFiltro(filtro.id)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.chipFechaTexto, fechaFiltro === filtro.id && styles.chipFechaTextoActivo]}
            >
              {filtro.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? <ErrorText message={error} /> : null}

      {loading && casos.length === 0 ? (
        <Loading />
      ) : (
        <FlatList
          data={casos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.lista, casos.length === 0 && styles.listaVacia]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={cargar}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <CasoHistorialCard
              caso={item}
              onValorar={setCasoAValorar}
              onVerPerfil={irAlPerfil}
              sinConexion={sinConexion}
            />
          )}
          ListEmptyComponent={
            <View style={styles.vacio}>
              <Text style={styles.vacioIcono}>📜</Text>
              <Text style={styles.vacioTitulo}>Sin casos resueltos</Text>
              <Text style={styles.vacioTexto}>
                Acá vas a ver los casos donde devolviste un objeto encontrado o recuperaste uno perdido una vez completada la entrega.
              </Text>
            </View>
          }
        />
      )}

      <ValorarModal
        visible={!!casoAValorar}
        caso={casoAValorar}
        onClose={() => setCasoAValorar(null)}
        onValorado={handleValorado}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.md,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  tabActiva: {
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabTexto: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  tabTextoActivo: {
    color: colors.text,
  },
  filtrosFechaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  filtroFechaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipFecha: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.round,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipFechaActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipFechaTexto: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  chipFechaTextoActivo: {
    color: colors.white,
    fontWeight: '700',
  },
  lista: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  listaVacia: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  vacio: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
    maxWidth: 280,
  },
});

