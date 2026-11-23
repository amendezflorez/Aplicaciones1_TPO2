import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Chip from '../../components/Chip';
import EstadoChip from '../../components/EstadoChip';
import FotoPublicacion from '../../components/FotoPublicacion';
import OfflineBanner from '../../components/OfflineBanner';
import { CardSkeleton, EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import TipoBadge from '../../components/TipoBadge';
import { CATEGORIAS } from '../../config/constants';
import { colors, radius, shadow, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { descartarItem, listarCola, pasarAEdicion, reintentarItem } from '../../services/offline/colaPendientes';
import {
  escucharColaProcesada,
  hayAvisosGlobales,
  procesarColaPendientes,
} from '../../services/offline/colaProcesador';
import { getMisPublicaciones, renovarPublicacion } from '../../services/publicacionesService';
import { getBarrios } from '../../services/userService';
import { formatFecha, formatFechaSuceso } from '../../utils/publicacionFormatters';

const DIA_MS = 24 * 60 * 60 * 1000;
// Misma ventana que el backend (VENTANA_RENOVACION_ANTICIPADA): desde acá se destaca en
// tono de advertencia el "Vence en N días".
const DIAS_AVISO_VENCIMIENTO = 5;

const FILTROS = [
  { id: 'todas', label: 'Todas', estados: null },
  { id: 'abierta', label: 'Abiertas', estados: ['abierta'] },
  { id: 'en_reclamo', label: 'En reclamo', estados: ['en_reclamo'] },
  { id: 'resuelta', label: 'Resueltas', estados: ['resuelta'] },
  { id: 'vencida', label: 'Vencidas', estados: ['vencida'] },
];

// "Vence en 3 días" / "Vence mañana" / "Vence hoy" / "Venció el 12 nov". null si no aplica
// (resuelta, o sin venceEn). Usa venceEn de la API (las publicaciones vencen a los 30 días).
function textoVencimiento(pub) {
  if (!pub.venceEn || pub.estado === 'resuelta') return null;
  const vence = new Date(pub.venceEn);
  if (Number.isNaN(vence.getTime())) return null;
  const ms = vence.getTime() - Date.now();
  if (pub.estado === 'vencida' || ms <= 0) {
    return { texto: `Venció el ${formatFecha(pub.venceEn)}`, aviso: true };
  }
  const dias = Math.ceil(ms / DIA_MS);
  if (dias <= 1) return { texto: 'Vence hoy', aviso: true };
  if (dias === 2) return { texto: 'Vence mañana', aviso: true };
  return { texto: `Vence en ${dias} días`, aviso: dias <= DIAS_AVISO_VENCIMIENTO };
}

// "Mis publicaciones": pantalla inicial de la tab Publicar (la bandeja es la puerta de
// entrada y no el formulario). Combina lo ya publicado en el servidor
// (MiPublicacionResponse) con la cola local de pendientes de envío (Punto 6), que siempre
// está disponible aunque no haya conexión. No usa <Screen> porque la lista es una FlatList
// (no puede ir dentro de un ScrollView) — por eso el OfflineBanner se agrega a mano.
export default function MisPublicacionesScreen({ navigation }) {
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [cola, setCola] = useState([]);
  const [barrios, setBarrios] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [loading, setLoading] = useState(true); // primera carga
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [cargoServidor, setCargoServidor] = useState(false); // ya hubo una respuesta del servidor
  const [renovandoId, setRenovandoId] = useState(null);
  const [accionEnCurso, setAccionEnCurso] = useState(null);

  // Siempre el valor más reciente, sin re-crear `cargar` (que re-dispararía el efecto de foco).
  const sinConexionRef = useRef(sinConexion);
  useEffect(() => {
    sinConexionRef.current = sinConexion;
  }, [sinConexion]);

  const leerCola = useCallback(async () => {
    try {
      setCola(await listarCola(user.id));
    } catch {
      toast.error('No pudimos leer tus publicaciones pendientes de envío.');
    }
  }, [user.id, toast]);

  // `modo`: 'inicial' (skeleton), 'pull' (RefreshControl) o 'silencioso' (sin indicador).
  const cargar = useCallback(
    async (modo = 'silencioso') => {
      if (modo === 'inicial') setLoading(true);
      if (modo === 'pull') setRefreshing(true);
      await leerCola();
      if (!sinConexionRef.current) {
        try {
          setItems(await getMisPublicaciones());
          setCargoServidor(true);
          setError('');
        } catch (e) {
          // Sin conexión real (el flag aún no lo sabía): se trata como offline. Otro error
          // sí se muestra, con reintento.
          setError(esErrorDeRed(e) ? '' : getErrorMessage(e));
          if (modo === 'pull') toast.error(getErrorMessage(e));
        }
      }
      setLoading(false);
      setRefreshing(false);
    },
    [leerCola, toast]
  );

  useFocusEffect(
    useCallback(() => {
      cargar(cargoServidor ? 'silencioso' : 'inicial');
      getBarrios()
        .then(setBarrios)
        .catch(() => {
          // Solo se usa para el nombre del barrio de los pendientes; si falla se muestra
          // "Sin barrio", no es un error que valga la pena mostrar.
        });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cargar, sinConexion])
  );

  // Punto 6: al reconectar, la cola se procesa en segundo plano. Si esta pantalla está
  // abierta, cada pendiente enviado (o rechazado) la refresca sola. El toast lo muestra
  // <AvisosCola /> global; si no está montado, se muestra acá.
  useEffect(
    () =>
      escucharColaProcesada((userId, evento) => {
        if (userId !== user.id) return;
        cargar('silencioso');
        if (!hayAvisosGlobales() && evento) {
          if (evento.tipo === 'enviada') toast.success('¡Publicada! Ya aparece en las búsquedas.');
          else toast.error('No pudimos publicar una de tus publicaciones pendientes.');
        }
      }),
    [cargar, user.id, toast]
  );

  const renovar = async (id) => {
    setRenovandoId(id);
    try {
      const actualizada = await renovarPublicacion(id);
      setItems((actuales) => actuales.map((item) => (item.id === id ? { ...item, ...actualizada } : item)));
      toast.success('Publicación renovada: vuelve a estar abierta por 30 días.');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setRenovandoId(null);
    }
  };

  const editarPendiente = async (item) => {
    setAccionEnCurso(item.clientRequestId);
    try {
      // retomar:true → el wizard abre directo con estos datos, sin el aviso
      // "¿Retomar o descartar?". Si pasarAEdicion no encontró el ítem (ya se envió o se
      // descartó mientras tanto), no se navega y se avisa.
      if (await pasarAEdicion(user.id, item.clientRequestId)) {
        navigation.navigate('PublicarWizard', { retomar: true });
      } else {
        toast.info('Esa publicación ya no está pendiente.');
      }
    } catch {
      toast.error('No pudimos abrir la publicación para editarla.');
    } finally {
      setAccionEnCurso(null);
      leerCola();
    }
  };

  const reintentarPendiente = async (item) => {
    setAccionEnCurso(item.clientRequestId);
    try {
      // Vuelve a 'pendiente' con los intentos en cero: también saltea la espera de un
      // reintento automático programado ("Enviar ahora" no tiene que esperar).
      await reintentarItem(user.id, item.clientRequestId);
      await leerCola();
      if (sinConexion) {
        toast.info('Sin conexión: se va a enviar sola cuando vuelva.');
      } else {
        toast.info('Reintentando el envío…');
        procesarColaPendientes(user.id);
      }
    } catch {
      toast.error('No pudimos reintentar el envío.');
    } finally {
      setAccionEnCurso(null);
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
            toast.success('Publicación descartada.');
          } catch {
            toast.error('No pudimos descartar la publicación.');
          } finally {
            setAccionEnCurso(null);
            leerCola();
          }
        },
      },
    ]);
  };

  const irAPublicar = () => navigation.navigate('PublicarWizard');
  // DetallePublicacionScreen lee route.params.id.
  const irAlDetalle = (id) => navigation.navigate('Buscar', { screen: 'DetallePublicacion', params: { id } });

  const filtroActual = FILTROS.find((f) => f.id === filtro) ?? FILTROS[0];
  const visibles = useMemo(
    () => (filtroActual.estados ? items.filter((p) => filtroActual.estados.includes(p.estado)) : items),
    [items, filtroActual]
  );
  const conteos = useMemo(() => {
    const c = { todas: items.length };
    for (const f of FILTROS) if (f.estados) c[f.id] = items.filter((p) => f.estados.includes(p.estado)).length;
    return c;
  }, [items]);

  // Pendientes primero (necesitan atención) y solo en "Todas".
  const pendientes = filtro === 'todas' ? cola : [];
  const hayAlgo = items.length > 0 || cola.length > 0;
  const sinNadaPorError = !hayAlgo && !cargoServidor && (error || sinConexion);

  const encabezado = (
    <View style={styles.encabezado}>
      <Text style={styles.resumen}>
        {hayAlgo
          ? `${items.length + cola.length} ${items.length + cola.length === 1 ? 'publicación' : 'publicaciones'}`
          : 'Tus pérdidas y hallazgos'}
      </Text>
      {hayAlgo ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtros}>
          {FILTROS.map((f) => (
            <Chip
              key={f.id}
              label={f.id === 'todas' || conteos[f.id] === 0 ? f.label : `${f.label} · ${conteos[f.id]}`}
              selected={filtro === f.id}
              onPress={() => setFiltro(f.id)}
            />
          ))}
        </ScrollView>
      ) : null}
      {sinConexion && hayAlgo ? (
        <InlineMessage tone="info" message="Sin conexión: no podés renovar publicaciones hasta que vuelva." />
      ) : null}
      {error && hayAlgo ? <InlineMessage tone="error" message={error} /> : null}
      {pendientes.length > 0 ? (
        <View style={styles.seccion}>
          <Text style={typography.overline}>Pendientes de envío · {pendientes.length}</Text>
          {pendientes.map((item) => (
            <PendienteCard
              key={item.clientRequestId}
              item={item}
              barrios={barrios}
              sinConexion={sinConexion}
              busy={accionEnCurso === item.clientRequestId}
              onEditar={() => editarPendiente(item)}
              onReintentar={() => reintentarPendiente(item)}
              onDescartar={() => descartarPendiente(item)}
            />
          ))}
        </View>
      ) : null}
      {visibles.length > 0 && pendientes.length > 0 ? <Text style={typography.overline}>Publicadas</Text> : null}
    </View>
  );

  let vacio = null;
  if (loading) {
    vacio = <CardSkeleton count={3} />;
  } else if (sinNadaPorError) {
    vacio = (
      <ErrorState
        title={sinConexion && !error ? 'Sin conexión' : 'No pudimos cargar tus publicaciones'}
        message={
          sinConexion && !error
            ? 'Necesitás conexión para ver tus publicaciones. Igual podés crear una nueva: se envía sola cuando vuelva.'
            : error
        }
        onRetry={() => cargar('inicial')}
      />
    );
  } else if (!hayAlgo) {
    vacio = (
      <EmptyState
        icon="megaphone-outline"
        title="Todavía no publicaste nada"
        message="Publicá lo que perdiste o encontraste para que otros lo vean."
        actionLabel="Publicar ahora"
        onAction={irAPublicar}
      />
    );
  } else if (visibles.length === 0 && pendientes.length === 0) {
    vacio = (
      <EmptyState
        icon="funnel-outline"
        title={`No tenés publicaciones ${filtroActual.label.toLowerCase()}`}
        message="Probá con otro filtro."
        secondaryLabel="Ver todas"
        onSecondary={() => setFiltro('todas')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <OfflineBanner />
      <FlatList
        data={loading || sinNadaPorError ? [] : visibles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ListHeaderComponent={loading || sinNadaPorError ? <Text style={styles.resumen}>Tus pérdidas y hallazgos</Text> : encabezado}
        ListEmptyComponent={vacio}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => cargar('pull')}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <PublicadaCard
            item={item}
            sinConexion={sinConexion}
            renovando={renovandoId === item.id}
            onPress={() => irAlDetalle(item.id)}
            onRenovar={() => renovar(item.id)}
          />
        )}
      />
      <Pressable
        onPress={irAPublicar}
        style={({ pressed }) => [styles.fab, shadow.lg, pressed && { opacity: 0.9 }]}
        accessibilityRole="button"
        accessibilityLabel="Publicar una pérdida o un hallazgo"
      >
        <Ionicons name="add" size={24} color={colors.white} />
        <Text style={styles.fabTexto}>Publicar</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function PublicadaCard({ item, sinConexion, renovando, onPress, onRenovar }) {
  const categoria = CATEGORIAS.find((c) => c.id === item.categoria)?.label ?? item.categoria;
  const venc = textoVencimiento(item);
  return (
    <Card onPress={onPress} padded={false} style={styles.card} accessibilityLabel={item.titulo}>
      <View style={styles.cardFila}>
        <View style={styles.fotoWrap}>
          <FotoPublicacion key={item.fotoPrincipalUrl} url={item.fotoPrincipalUrl} style={styles.fotoPublicada} />
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.badges}>
            <TipoBadge tipo={item.tipo} />
            <EstadoChip estado={item.estado} />
          </View>
          <Text style={styles.cardTitulo} numberOfLines={2}>
            {item.titulo}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {categoria} · {item.barrio?.name ?? 'Sin barrio'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {formatFechaSuceso(item.fechaSuceso)}
          </Text>
          {venc ? (
            <View style={styles.vencFila}>
              <Ionicons
                name="time-outline"
                size={14}
                color={venc.aviso ? colors.warning : colors.textMuted}
              />
              <Text style={[styles.meta, venc.aviso && styles.vencAviso]}>{venc.texto}</Text>
            </View>
          ) : null}
        </View>
      </View>
      {item.estado === 'vencida' || item.puedeRenovar === true ? (
        <View style={styles.cardAcciones}>
          <Button
            title="Renovar por 30 días"
            icon="refresh"
            variant="secondary"
            size="sm"
            onPress={onRenovar}
            loading={renovando}
            disabled={sinConexion}
            style={styles.flex1}
          />
          {sinConexion ? <Text style={styles.sinConexion}>Necesitás conexión para renovar.</Text> : null}
        </View>
      ) : null}
    </Card>
  );
}

// Punto 6: una publicación todavía no enviada. 'pendiente' espera su turno en la cola (se
// envía sola al haber conexión, o "Enviar ahora"); 'error' (un 4xx del backend) ofrece
// Reintentar, Editar (reabre el wizard con esos datos, vía pasarAEdicion) o Descartar.
function PendienteCard({ item, barrios, sinConexion, busy, onEditar, onReintentar, onDescartar }) {
  const barrio = barrios.find((b) => b.id === item.borrador.barrioId);
  const foto = item.borrador.fotos?.[0]?.uri;
  const esError = item.estado === 'error';

  return (
    <Card padded={false} style={styles.card}>
      <View style={styles.cardFila}>
        <View style={styles.fotoWrap}>
          {foto ? (
            <Image source={{ uri: foto }} style={styles.foto} />
          ) : (
            <View style={[styles.foto, styles.fotoVacia]}>
              <Ionicons name="image-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.badges}>
            {item.borrador.tipo ? <TipoBadge tipo={item.borrador.tipo} /> : null}
            {esError ? (
              <Chip label="No se pudo enviar" tone="error" icon="alert-circle" size="sm" />
            ) : (
              <EstadoChip estado="pendiente_envio" />
            )}
          </View>
          <Text style={styles.cardTitulo} numberOfLines={2}>
            {item.borrador.titulo || 'Sin título'}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {barrio?.name ?? 'Sin barrio'}
          </Text>
          {esError && item.mensajeError ? <Text style={styles.errorTexto}>{item.mensajeError}</Text> : null}
          {!esError ? (
            <Text style={styles.meta}>
              {item.mensajeError
                ? item.mensajeError
                : sinConexion
                  ? 'Se envía sola cuando vuelva la conexión.'
                  : 'Enviando en unos segundos…'}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.cardAcciones}>
        {esError ? (
          <>
            <Button title="Reintentar" icon="refresh" size="sm" onPress={onReintentar} loading={busy} style={styles.flex1} />
            <Button title="Editar" icon="create-outline" variant="secondary" size="sm" onPress={onEditar} disabled={busy} style={styles.flex1} />
          </>
        ) : (
          <Button
            title="Enviar ahora"
            icon="cloud-upload-outline"
            variant="secondary"
            size="sm"
            onPress={onReintentar}
            loading={busy}
            disabled={sinConexion}
            style={styles.flex1}
          />
        )}
        <Button title="Descartar" icon="trash-outline" variant="danger" size="sm" onPress={onDescartar} disabled={busy} style={styles.flex1} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  lista: { padding: spacing.md, paddingBottom: 112, gap: spacing.md },
  encabezado: { gap: spacing.md },
  resumen: { ...typography.title },
  filtros: { gap: spacing.sm, paddingRight: spacing.md },
  seccion: { gap: spacing.sm + 2 },

  card: { overflow: 'hidden' },
  cardFila: { flexDirection: 'row' },
  fotoWrap: { width: 112, minHeight: 124, overflow: 'hidden' },
  // Absoluta (igual que fotoPublicada): con height '100%' la foto local de la cámara, que es
  // enorme, estiraba la tarjeta de la cola sin conexión en Android.
  foto: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.surface },
  // Absoluta: con height '100%' la foto estiraba la fila y empujaba el botón Renovar fuera
  // de la tarjeta (overflow: 'hidden' lo recortaba).
  fotoPublicada: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.surface },
  fotoVacia: { alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, padding: spacing.md - 4, gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs + 2 },
  cardTitulo: { ...typography.subheading },
  meta: { ...typography.caption, color: colors.textSecondary },
  vencFila: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  vencAviso: { color: colors.warning, fontWeight: '700' },
  errorTexto: { ...typography.caption, color: colors.error },
  cardAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md - 4,
    paddingBottom: spacing.md - 4,
  },
  sinConexion: { ...typography.caption, width: '100%' },

  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    minHeight: 52,
    paddingHorizontal: spacing.lg - 4,
    borderRadius: radius.round,
    backgroundColor: colors.accent,
  },
  fabTexto: { color: colors.white, fontSize: 16, fontWeight: '800' },
});
