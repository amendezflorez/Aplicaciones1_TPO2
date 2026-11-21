import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useNotificaciones } from '../../hooks/useNotificaciones';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';
import { formatFecha, formatHaceCuanto } from '../../utils/publicacionFormatters';

// Punto 12: bandeja con el historial de notificaciones recibidas. Las no leídas se
// distinguen con fondo, punto de color y título en negrita. Tocar una la marca como leída
// y abre la pantalla correspondiente (mismo destino que al tocar el push).
const ICONOS = {
  reclamo_recibido: { icon: 'mail-unread', color: colors.accent, bg: colors.accentSoft },
  reclamo_aceptado: { icon: 'checkmark-circle', color: colors.success, bg: colors.successSoft },
  reclamo_rechazado: { icon: 'close-circle', color: colors.error, bg: colors.errorSoft },
  reclamo_vencido: { icon: 'time', color: colors.textMuted, bg: colors.surface },
  encuentro_propuesto: { icon: 'location', color: colors.primary, bg: colors.primarySoft },
  encuentro_modificado: { icon: 'swap-horizontal', color: colors.warning, bg: colors.warningSoft },
  encuentro_aceptado: { icon: 'flag', color: colors.success, bg: colors.successSoft },
  devolucion_confirmada: { icon: 'heart', color: colors.accent, bg: colors.accentSoft },
};

function grupoDe(iso) {
  const f = new Date(iso);
  const hoy = new Date();
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();
  if (f.getTime() >= inicioHoy) return 'Hoy';
  if (f.getTime() >= inicioHoy - 6 * 86400000) return 'Esta semana';
  return 'Anteriores';
}

export default function NotificacionesScreen({ navigation }) {
  const { items, noLeidas, cargando, error, refrescar, marcarTodas, abrir, pushRemoto } = useNotificaciones();
  const toast = useToast();
  const [primeraCarga, setPrimeraCarga] = useState(items.length === 0);
  const [marcando, setMarcando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refrescar({ manual: true }).finally(() => setPrimeraCarga(false));
    }, [refrescar])
  );

  const onMarcarTodas = useCallback(async () => {
    setMarcando(true);
    try {
      await marcarTodas();
      toast.success('Listo, marcamos todo como leído.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setMarcando(false);
    }
  }, [marcarTodas, toast]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        noLeidas > 0 ? (
          <Pressable onPress={onMarcarTodas} disabled={marcando} hitSlop={8} accessibilityRole="button">
            <Text style={[styles.headerAction, marcando && { opacity: 0.5 }]}>Marcar todas</Text>
          </Pressable>
        ) : null,
    });
  }, [navigation, noLeidas, marcando, onMarcarTodas]);

  // Lista plana con separadores de grupo ("Hoy", "Esta semana", "Anteriores").
  const filas = useMemo(() => {
    const out = [];
    let actual = null;
    items.forEach((n) => {
      const g = grupoDe(n.creadaEn);
      if (g !== actual) {
        out.push({ tipoFila: 'grupo', id: `g-${g}`, titulo: g });
        actual = g;
      }
      out.push({ tipoFila: 'item', ...n });
    });
    return out;
  }, [items]);

  if (primeraCarga && cargando && items.length === 0) {
    return <View style={styles.fill} />;
  }

  if (error && items.length === 0) {
    return (
      <View style={styles.fill}>
        <ErrorState message={error} onRetry={() => refrescar({ manual: true })} retrying={cargando} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.fill}
      contentContainerStyle={styles.content}
      data={filas}
      keyExtractor={(f) => f.id}
      refreshControl={
        <RefreshControl refreshing={cargando} onRefresh={() => refrescar({ manual: true })} colors={[colors.primary]} />
      }
      ListHeaderComponent={
        <View style={{ gap: spacing.sm }}>
          {!pushRemoto ? (
            <InlineMessage
              tone="info"
              message="Estás usando Expo Go: los avisos llegan mientras la app está abierta o en segundo plano. Con la app instalada (APK) llegan aunque esté cerrada."
            />
          ) : null}
          {error ? <InlineMessage tone="error" message={error} /> : null}
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="notifications-outline"
          title="No tenés notificaciones"
          message="Te avisamos acá cuando recibas un reclamo, cambie el estado de uno tuyo o te propongan un punto de encuentro."
        />
      }
      renderItem={({ item }) => {
        if (item.tipoFila === 'grupo') return <Text style={styles.grupo}>{item.titulo}</Text>;
        const est = ICONOS[item.tipo] ?? { icon: 'notifications', color: colors.primary, bg: colors.primarySoft };
        const nueva = !item.leida;
        return (
          <Pressable
            onPress={() =>
              abrir({ notificacionId: item.id, tipo: item.tipo, reclamoId: item.reclamoId, publicacionId: item.publicacionId })
            }
            accessibilityRole="button"
            accessibilityLabel={`${nueva ? 'No leída. ' : ''}${item.titulo}. ${item.cuerpo}`}
            style={({ pressed }) => [styles.item, nueva && styles.itemNueva, pressed && { opacity: 0.85 }]}
          >
            <View style={[styles.icono, { backgroundColor: est.bg }]}>
              <Ionicons name={est.icon} size={20} color={est.color} />
            </View>
            <View style={styles.textos}>
              <Text style={[styles.titulo, nueva && styles.tituloNueva]} numberOfLines={2}>
                {item.titulo}
              </Text>
              <Text style={styles.cuerpo} numberOfLines={3}>
                {item.cuerpo}
              </Text>
              <Text style={styles.fecha}>
                {grupoDe(item.creadaEn) === 'Anteriores'
                  ? formatFecha(item.creadaEn)
                  : formatHaceCuanto(new Date(item.creadaEn).getTime())}
              </Text>
            </View>
            {nueva ? <View style={styles.dot} accessibilityElementsHidden /> : null}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    flexGrow: 1,
  },
  headerAction: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  grupo: {
    ...typography.overline,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md - 4,
    padding: spacing.md - 2,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemNueva: {
    backgroundColor: '#F2FAF8',
    borderColor: '#BFE3DC',
  },
  icono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    ...typography.bodyStrong,
    fontWeight: '500',
  },
  tituloNueva: {
    fontWeight: '800',
  },
  cuerpo: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 19,
  },
  fecha: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginTop: 6,
  },
});
