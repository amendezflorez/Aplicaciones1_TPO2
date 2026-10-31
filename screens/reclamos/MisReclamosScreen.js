import { useCallback, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useReclamos } from '../../hooks/useReclamos';
import { colors, radius, spacing } from '../../config/theme';
import ErrorText from '../../components/ErrorText';
import OfflineBanner from '../../components/OfflineBanner';
import ReclamoCard from '../../components/ReclamoCard';

export default function MisReclamosScreen() {
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const { reclamos, loading, error, refresh, decidir } = useReclamos();
  const [vista, setVista] = useState('recibidos');
  const [decisionEnCurso, setDecisionEnCurso] = useState(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    }, [refresh])
  );

  const recibidos = vista === 'recibidos';
  const items = reclamos.filter((reclamo) =>
    recibidos ? reclamo.publicadorId === user?.id : reclamo.autorId === user?.id
  );

  const confirmarDecision = (reclamo, decision) => {
    const verbo = decision === 'aceptar' ? 'aceptar' : 'rechazar';
    Alert.alert(
      `${decision === 'aceptar' ? 'Aceptar' : 'Rechazar'} reclamo`,
      `¿Confirmás que querés ${verbo} el reclamo de “${reclamo.publicacionTitulo}”?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: decision === 'aceptar' ? 'Aceptar' : 'Rechazar', style: decision === 'rechazar' ? 'destructive' : 'default', onPress: async () => {
          setDecisionEnCurso(reclamo.id);
          try {
            await decidir(reclamo.id, decision);
          } catch {
            Alert.alert('No se pudo actualizar', 'Actualizá la bandeja e intentá nuevamente.');
          } finally {
            setDecisionEnCurso(null);
          }
        } },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <OfflineBanner />
      {sinConexion && recibidos ? (
        <Text style={styles.avisoSinConexion}>Necesitás conexión para aceptar o rechazar reclamos.</Text>
      ) : null}
      <View style={styles.tabs}>
        {[
          { id: 'recibidos', label: `Recibidos (${reclamos.filter((item) => item.publicadorId === user?.id).length})` },
          { id: 'enviados', label: `Enviados (${reclamos.filter((item) => item.autorId === user?.id).length})` },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: vista === tab.id }}
            style={[styles.tab, vista === tab.id && styles.tabSelected]}
            onPress={() => setVista(tab.id)}
          >
            <Text style={[styles.tabText, vista === tab.id && styles.tabTextSelected]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ErrorText message={error} />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !items.length && styles.emptyList]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <ReclamoCard
            reclamo={item}
            recibido={recibidos}
            onDecision={confirmarDecision}
            busy={decisionEnCurso === item.id}
            sinConexion={sinConexion}
          />
        )}
        ListEmptyComponent={(
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Todavía no hay reclamos {recibidos ? 'recibidos' : 'enviados'}</Text>
            <Text style={styles.emptyText}>Cuando haya actividad, vas a verla en esta bandeja.</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  avisoSinConexion: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  tabs: { flexDirection: 'row', margin: spacing.md, borderBottomWidth: 1, borderColor: colors.border },
  tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: colors.primary },
  tabText: { color: colors.textMuted, fontWeight: '600', fontSize: 14 },
  tabTextSelected: { color: colors.primaryDark },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  empty: { alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 17, textAlign: 'center' },
  emptyText: { color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
});