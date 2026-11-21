import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { CardSkeleton, EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import OfflineBanner from '../../components/OfflineBanner';
import ReclamoCard from '../../components/ReclamoCard';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useReclamos } from '../../hooks/useReclamos';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';

const INTERVALO_MS = 30000;

// Pendientes primero (los que vencen antes arriba), después aceptados en curso, y el resto
// por fecha descendente.
function prioridad(reclamo) {
  if (reclamo.estado === 'pendiente') return 0;
  if (reclamo.estado === 'aceptado' && reclamo.publicacionEstado !== 'resuelta') return 1;
  return 2;
}

function ordenar(lista) {
  return [...lista].sort((a, b) => {
    const diff = prioridad(a) - prioridad(b);
    if (diff !== 0) return diff;
    if (prioridad(a) === 0) return new Date(a.venceEn) - new Date(b.venceEn);
    return new Date(b.creadaEn) - new Date(a.creadaEn);
  });
}

function Segmento({ tabs, valor, onChange }) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const activo = tab.id === valor;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onChange(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${tab.label}, ${tab.count}`}
            style={[styles.segmentItem, activo && styles.segmentItemActive]}
          >
            <Text style={[styles.segmentText, activo && styles.segmentTextActive]}>{tab.label}</Text>
            <View style={[styles.count, activo && styles.countActive, tab.alerta && styles.countAlert]}>
              <Text style={[styles.countText, (activo || tab.alerta) && styles.countTextActive]}>{tab.count}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function MisReclamosScreen() {
  const navigation = useNavigation();
  const toast = useToast();
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const { reclamos, loading, refreshing, cargado, error, refresh, decidir } = useReclamos();
  const [vista, setVista] = useState('recibidos');
  // { id, accion } del reclamo que se está aceptando/rechazando.
  const [enCurso, setEnCurso] = useState(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      // Polling silencioso: no activa el spinner (ver ReclamosContext).
      const interval = setInterval(refresh, INTERVALO_MS);
      return () => clearInterval(interval);
    }, [refresh])
  );

  const recibidosLista = useMemo(
    () => ordenar(reclamos.filter((r) => r.publicadorId === user?.id)),
    [reclamos, user?.id]
  );
  const enviadosLista = useMemo(
    () => ordenar(reclamos.filter((r) => r.autorId === user?.id)),
    [reclamos, user?.id]
  );
  const pendientesRecibidos = recibidosLista.filter((r) => r.estado === 'pendiente').length;

  const recibidos = vista === 'recibidos';
  const items = recibidos ? recibidosLista : enviadosLista;

  const ejecutarDecision = async (reclamo, decision) => {
    setEnCurso({ id: reclamo.id, accion: decision });
    try {
      await decidir(reclamo.id, decision);
      if (decision === 'aceptar') toast.success('Reclamo aceptado. Ahora coordiná la devolución.');
      else toast.success('Reclamo rechazado.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
      refresh();
    } finally {
      setEnCurso(null);
    }
  };

  const confirmarDecision = (reclamo, decision) => {
    const aceptar = decision === 'aceptar';
    Alert.alert(
      aceptar ? 'Aceptar reclamo' : 'Rechazar reclamo',
      aceptar
        ? `Vas a aceptar el reclamo de ${reclamo.autorNombre || 'esta persona'} sobre “${reclamo.publicacionTitulo}”. Después podrán coordinar la devolución.`
        : `¿Seguro que querés rechazar el reclamo de ${reclamo.autorNombre || 'esta persona'}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: aceptar ? 'Aceptar' : 'Rechazar',
          style: aceptar ? 'default' : 'destructive',
          onPress: () => ejecutarDecision(reclamo, decision),
        },
      ]
    );
  };

  const abrirPublicacion = (reclamo) => {
    navigation.navigate('Buscar', {
      screen: 'DetallePublicacion',
      params: { id: reclamo.publicacionId },
    });
  };
  const abrirEncuentro = (reclamo) => navigation.navigate('PuntoEncuentro', { reclamoId: reclamo.id });
  const confirmarEntrega = (reclamo) => {
    navigation.navigate('ConfirmarDevolucion', {
      publicacionId: reclamo.publicacionId,
      reclamoId: reclamo.id,
    });
  };
  const mostrarQr = (reclamo) => {
    navigation.navigate('MostrarQr', {
      publicacionId: reclamo.publicacionId,
      titulo: reclamo.publicacionTitulo,
      reclamoId: reclamo.id,
    });
  };

  const tabs = [
    { id: 'recibidos', label: 'Recibidos', count: recibidosLista.length, alerta: pendientesRecibidos > 0 },
    { id: 'enviados', label: 'Enviados', count: enviadosLista.length, alerta: false },
  ];

  // Un solo estado a la vez: carga inicial -> error sin datos -> vacío -> lista.
  const primeraCarga = loading && !cargado;
  const errorSinDatos = Boolean(error) && !cargado;

  let cuerpo = null;
  if (primeraCarga) cuerpo = <CardSkeleton count={3} />;
  else if (errorSinDatos) cuerpo = <ErrorState message={error} onRetry={() => refresh({ manual: true })} retrying={refreshing} />;

  return (
    <View style={styles.container}>
      <OfflineBanner />
      <View style={styles.top}>
        <Segmento tabs={tabs} valor={vista} onChange={setVista} />
        {sinConexion && recibidos ? (
          <InlineMessage tone="warning" message="Sin conexión: necesitás internet para aceptar o rechazar reclamos." />
        ) : null}
        {error && cargado ? (
          <InlineMessage tone="warning" message="No pudimos actualizar tus reclamos. Mostramos la última lista cargada." />
        ) : null}
      </View>
      {cuerpo ? (
        <View style={styles.body}>{cuerpo}</View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={(
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => refresh({ manual: true })}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          )}
          renderItem={({ item }) => (
            <ReclamoCard
              reclamo={item}
              userId={user?.id}
              onDecision={confirmarDecision}
              onOpenPublicacion={abrirPublicacion}
              onOpenEncuentro={abrirEncuentro}
              onConfirmarEntrega={confirmarEntrega}
              onMostrarQr={mostrarQr}
              accionEnCurso={enCurso?.id === item.id ? enCurso.accion : null}
              sinConexion={sinConexion}
            />
          )}
          ListEmptyComponent={recibidos ? (
            <EmptyState
              icon="mail-open-outline"
              title="Todavía no recibiste reclamos"
              message="Cuando alguien reclame una de tus publicaciones, vas a verlo acá y podrás aceptarlo o rechazarlo."
            />
          ) : (
            <EmptyState
              icon="paper-plane-outline"
              title="No enviaste reclamos"
              message="Si encontrás una publicación que te interesa, tocá “Es mío” o “Lo encontré” para iniciar un reclamo."
              actionLabel="Buscar publicaciones"
              onAction={() => navigation.navigate('Buscar')}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  top: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.sm, gap: spacing.sm },
  body: { padding: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xs,
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm + 2,
  },
  segmentItemActive: { backgroundColor: colors.card },
  segmentText: { ...typography.bodyStrong, color: colors.textSecondary },
  segmentTextActive: { color: colors.primary },
  count: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.borderStrong,
  },
  countActive: { backgroundColor: colors.primary },
  countAlert: { backgroundColor: colors.accent },
  countText: { fontSize: 12, fontWeight: '800', color: colors.white },
  countTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});
