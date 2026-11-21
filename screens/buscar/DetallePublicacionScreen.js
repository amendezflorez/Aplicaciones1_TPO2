import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Avatar from '../../components/Avatar';
import BadgeChip from '../../components/BadgeChip';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { ICONOS_CATEGORIA } from '../../components/CategoriaPicker';
import EstadoChip from '../../components/EstadoChip';
import InfoRow from '../../components/InfoRow';
import PhotoGallery from '../../components/PhotoGallery';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { ErrorState, InlineMessage, Skeleton } from '../../components/StateViews';
import TipoBadge from '../../components/TipoBadge';
import { CATEGORIAS } from '../../config/constants';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { guardarDetalle, obtenerDetalle as obtenerDetalleCacheado } from '../../services/offline/detallesCache';
import { getDetallePublicacion } from '../../services/publicacionesService';
import { dejarDeSeguirPublicacion, marcarSeguimientoVisto, seguirPublicacion } from '../../services/seguimientosService';
import {
  formatCoordenadas,
  formatFecha,
  formatFechaRelativa,
  formatFranjaHoraria,
} from '../../utils/publicacionFormatters';

// Detalle de una publicación (Punto 4) + caché offline (Punto 6): con éxito online se guarda
// (detalle + fotos a disco) vía services/offline/detallesCache.js; sin conexión (o si la
// request falla por red) se muestra la última versión guardada, si hay. Las acciones viven en
// un footer fijo y cambian según quién mira (propia / ajena) y el estado de la publicación.
export default function DetallePublicacionScreen({ route, navigation }) {
  const { id } = route.params;
  const toast = useToast();
  const { sinConexion } = useConnectivity();
  const [detalle, setDetalle] = useState(null);
  const [error, setError] = useState('');
  const [desdeCache, setDesdeCache] = useState(false);
  const [siguiendo, setSiguiendo] = useState(false);
  const [cambiandoSeguir, setCambiandoSeguir] = useState(false);
  // Se incrementa para volver a pedir el detalle (botón Reintentar).
  const [intento, setIntento] = useState(0);

  const aplicarDetalle = (d, cacheado) => {
    setDetalle(d);
    setSiguiendo(d.siguiendo);
    setDesdeCache(cacheado);
    setError('');
  };

  // useFocusEffect (no useEffect simple) para refrescar yaReclame/estado al volver de
  // IniciarReclamoScreen, no solo al entrar por primera vez.
  useFocusEffect(
    useCallback(() => {
      let vigente = true;

      const intentarDesdeCache = async (mensajeSiNoHay) => {
        const cacheado = await obtenerDetalleCacheado(id);
        if (!vigente) return;
        if (cacheado) {
          aplicarDetalle(cacheado, true);
        } else {
          setError(mensajeSiNoHay);
        }
      };

      const cargar = async () => {
        if (sinConexion) {
          await intentarDesdeCache('No hay conexión y todavía no guardamos esta publicación para verla sin conexión.');
          return;
        }
        try {
          const d = await getDetallePublicacion(id);
          if (!vigente) return;
          aplicarDetalle(d, false);
          // Fire-and-forget: no bloquea el render del detalle. Si el guardado offline falla, no
          // afecta lo que se muestra: solo se pierde la copia para verla sin conexión.
          guardarDetalle(d).catch((err) => console.warn('No se pudo guardar el detalle offline', err));
          if (d.siguiendo) {
            marcarSeguimientoVisto(id).catch(() => {});
          }
        } catch (e) {
          if (!vigente) return;
          if (esErrorDeRed(e)) {
            await intentarDesdeCache(getErrorMessage(e));
            return;
          }
          setError(getErrorMessage(e));
        }
      };

      cargar();
      return () => {
        vigente = false;
      };
    // intento no se usa adentro: cambiarlo vuelve a disparar la carga (Reintentar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, sinConexion, intento])
  );

  const reintentar = () => {
    setError('');
    setDetalle(null);
    setIntento((n) => n + 1);
  };

  const toggleSeguir = async () => {
    setCambiandoSeguir(true);
    const siguiendoAntes = siguiendo;
    setSiguiendo(!siguiendoAntes);
    try {
      if (siguiendoAntes) {
        await dejarDeSeguirPublicacion(id);
        toast.info('Dejaste de seguir esta publicación.');
      } else {
        await seguirPublicacion(id);
        toast.success('Ahora seguís esta publicación. Te avisamos si cambia.');
      }
    } catch (e) {
      // 409 al seguir una que ya seguías: es el estado que la persona quería, no un error.
      if (e.response?.status === 409 && !siguiendoAntes) {
        toast.success('Ya seguías esta publicación.');
      } else {
        setSiguiendo(siguiendoAntes);
        toast.error(getErrorMessage(e));
      }
    } finally {
      setCambiandoSeguir(false);
    }
  };

  // "Mis publicaciones" (tab Publicar) es donde vive la gestión real: renovarla ahí mismo.
  const gestionarPublicacion = () => {
    navigation.navigate('Publicar', { screen: 'MisPublicaciones' });
  };

  const irAReclamo = (tipo) => {
    navigation.navigate('IniciarReclamo', {
      id,
      tipo,
      preguntaVerificacion: detalle.preguntaVerificacion,
      intentosRestantes: detalle.intentosRestantes,
    });
  };

  const irAlPerfil = () => {
    navigation.navigate('Perfil', { screen: 'PublicProfile', params: { userId: detalle.publicador.id } });
  };

  if (error) {
    return (
      <Screen>
        <ErrorState
          title="No pudimos cargar la publicación"
          message={error}
          onRetry={reintentar}
        />
      </Screen>
    );
  }

  if (!detalle) return <DetalleSkeleton />;

  const categoria = CATEGORIAS.find((c) => c.id === detalle.categoria);
  const franja = formatFranjaHoraria(detalle.franjaHoraria === 'manana' ? 'mañana' : detalle.franjaHoraria);
  const relativa = formatFechaRelativa(detalle.fechaSuceso);
  const coordsAprox = formatCoordenadas(detalle.lat, detalle.lng);
  const coordsExactas = formatCoordenadas(detalle.latExacta, detalle.lngExacta);
  const ubicacionRevelada = Boolean(detalle.direccionExacta || coordsExactas);
  const reputacion = detalle.publicador?.reputation;
  const insignias = detalle.publicador?.badges ?? [];

  // Reclamar: solo sobre publicaciones abiertas/en reclamo, sin reclamo vivo y con intentos.
  const cerrada = detalle.estado === 'resuelta' || detalle.estado === 'vencida';
  const intentos = detalle.intentosRestantes;
  const sinIntentos = intentos != null && intentos <= 0;
  const puedeReclamar = !detalle.esPropia && !cerrada && !detalle.yaReclame && !sinIntentos;
  const tipoReclamo = detalle.tipo === 'encontrado' ? 'es_mio' : 'lo_encontre';
  const tituloReclamo = detalle.tipo === 'encontrado' ? 'Es mío' : 'Lo encontré';

  let avisoReclamo = null;
  if (!detalle.esPropia) {
    if (detalle.estado === 'resuelta') {
      avisoReclamo = { tone: 'success', message: 'Esta publicación ya se resolvió: el objeto volvió a su dueño.' };
    } else if (detalle.estado === 'vencida') {
      avisoReclamo = { tone: 'warning', message: 'Esta publicación venció y ya no se puede reclamar.' };
    } else if (detalle.yaReclame) {
      avisoReclamo = { tone: 'info', message: 'Ya enviaste un reclamo sobre esta publicación. Mirá su estado en la pestaña Reclamos.' };
    } else if (sinIntentos) {
      avisoReclamo = { tone: 'warning', message: 'Ya usaste los 3 intentos de reclamo para esta publicación.' };
    } else if (intentos != null && intentos < 3) {
      avisoReclamo = {
        tone: 'info',
        message: `Te ${intentos === 1 ? 'queda 1 intento' : `quedan ${intentos} intentos`} para reclamar esta publicación.`,
      };
    }
  }

  const footer = detalle.esPropia ? (
    <Button title="Gestionar publicación" icon="settings-outline" onPress={gestionarPublicacion} />
  ) : (
    <>
      {sinConexion ? <Text style={styles.avisoSinConexion}>Necesitás conexión para reclamar o seguir esta publicación.</Text> : null}
      <View style={styles.footerFila}>
        <Button
          title={siguiendo ? 'Dejar de seguir' : 'Seguir'}
          icon={siguiendo ? 'bookmark' : 'bookmark-outline'}
          variant="secondary"
          onPress={toggleSeguir}
          loading={cambiandoSeguir}
          disabled={sinConexion}
          style={styles.botonSeguir}
        />
        <Button
          title={tituloReclamo}
          icon={detalle.tipo === 'encontrado' ? 'hand-left' : 'search'}
          onPress={() => irAReclamo(tipoReclamo)}
          disabled={!puedeReclamar || sinConexion}
          style={styles.botonReclamar}
        />
      </View>
    </>
  );

  return (
    <Screen footer={footer} style={styles.contenido}>
      <PhotoGallery fotos={detalle.fotos} style={styles.galeria} />

      <View style={styles.cuerpo}>
        {desdeCache ? (
          <InlineMessage tone="warning" message="Estás viendo la versión guardada de esta publicación: puede no estar actualizada." />
        ) : null}

        <View style={styles.badges}>
          <TipoBadge tipo={detalle.tipo} solid />
          <EstadoChip estado={detalle.estado} />
          {detalle.esPropia ? <Text style={styles.propia}>Tu publicación</Text> : null}
        </View>

        <Text style={styles.titulo} accessibilityRole="header">
          {detalle.titulo}
        </Text>

        {avisoReclamo ? <InlineMessage tone={avisoReclamo.tone} message={avisoReclamo.message} /> : null}

        <Card style={styles.datos}>
          <InfoRow icon={ICONOS_CATEGORIA[detalle.categoria] ?? 'pricetag-outline'} label="Categoría" value={categoria?.label ?? detalle.categoria} />
          <InfoRow
            icon="calendar-outline"
            label={detalle.tipo === 'perdido' ? 'Cuándo se perdió' : 'Cuándo se encontró'}
            value={`${formatFecha(detalle.fechaSuceso, { conAnio: true })}${franja ? ` · ${franja}` : ''}`}
          >
            {relativa ? <Text style={styles.sub}>{relativa}</Text> : null}
          </InfoRow>
          <InfoRow icon="location-outline" label="Barrio" value={detalle.barrio?.name ?? 'Sin barrio'} />
          {coordsAprox ? (
            <InfoRow icon="navigate-outline" label="Ubicación aproximada" value={coordsAprox}>
              <Text style={styles.sub}>Es una zona cercana: no es el punto exacto.</Text>
            </InfoRow>
          ) : null}
          {ubicacionRevelada ? (
            <>
              {detalle.direccionExacta ? (
                <InfoRow icon="home-outline" label="Dirección exacta" value={detalle.direccionExacta} />
              ) : null}
              {coordsExactas ? (
                <InfoRow icon="pin-outline" label="Coordenadas exactas" value={coordsExactas} />
              ) : null}
            </>
          ) : null}
        </Card>

        {!ubicacionRevelada && !detalle.esPropia ? (
          <View style={styles.candado}>
            <View style={styles.candadoIcono}>
              <Ionicons name="lock-closed" size={20} color={colors.warning} />
            </View>
            <Text style={styles.candadoTexto}>La dirección exacta se muestra cuando se acepte tu reclamo.</Text>
          </View>
        ) : null}

        <SectionHeader title="Descripción" />
        <Text style={styles.descripcion}>{detalle.descripcion}</Text>

        {!detalle.esPropia && detalle.publicador ? (
          <>
            <SectionHeader title="Publicado por" />
            <Card onPress={irAlPerfil} style={styles.publicador} accessibilityLabel={`Ver perfil de ${detalle.publicador.name}`}>
              <Avatar uri={detalle.publicador.photoUrl} name={detalle.publicador.name} size={52} />
              <View style={styles.publicadorInfo}>
                <Text style={styles.publicadorNombre}>{detalle.publicador.name}</Text>
                {reputacion ? (
                  <View style={styles.reputacion}>
                    <Ionicons name="shield-checkmark-outline" size={14} color={colors.primary} />
                    <Text style={styles.reputacionTexto}>
                      {reputacion.returnsCount} {reputacion.returnsCount === 1 ? 'devolución' : 'devoluciones'} ·{' '}
                      {reputacion.positiveCount} {reputacion.positiveCount === 1 ? 'valoración positiva' : 'valoraciones positivas'}
                    </Text>
                  </View>
                ) : null}
                {insignias.length > 0 ? (
                  <View style={styles.insignias}>
                    {insignias.map((b) => (
                      <BadgeChip key={b.code} label={b.label} />
                    ))}
                  </View>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Card>
          </>
        ) : null}

      </View>
    </Screen>
  );
}

// Esqueleto con la forma del detalle: galería, título y filas de datos.
function DetalleSkeleton() {
  return (
    <Screen style={styles.contenido}>
      <Skeleton height={280} radius={0} />
      <View style={styles.cuerpo}>
        <View style={styles.badges}>
          <Skeleton width={80} height={22} radius={radius.round} />
          <Skeleton width={70} height={22} radius={radius.round} />
        </View>
        <Skeleton width="85%" height={30} />
        <Skeleton height={150} radius={radius.lg} />
        <Skeleton height={14} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="60%" height={14} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Screen aplica padding md y gap md: acá la galería va pegada a los bordes y el resto del
  // contenido vive en "cuerpo" con su propio padding.
  contenido: {
    padding: 0,
    paddingBottom: spacing.xl,
    gap: 0,
  },
  galeria: {
    backgroundColor: colors.surface,
  },
  cuerpo: {
    padding: spacing.md,
    gap: spacing.md,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  propia: {
    ...typography.label,
    marginLeft: 'auto',
  },
  titulo: {
    ...typography.display,
    fontSize: 26,
    lineHeight: 32,
  },
  datos: {
    gap: spacing.md,
  },
  sub: {
    ...typography.caption,
  },
  candado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.md - 4,
    borderRadius: radius.lg,
    backgroundColor: colors.warningSoft,
  },
  candadoIcono: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candadoTexto: {
    flex: 1,
    ...typography.bodyStrong,
    color: colors.textSecondary,
  },
  descripcion: {
    ...typography.body,
    lineHeight: 24,
  },
  publicador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
  },
  publicadorInfo: {
    flex: 1,
    gap: 4,
  },
  publicadorNombre: {
    ...typography.subheading,
  },
  reputacion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reputacionTexto: {
    ...typography.caption,
    flex: 1,
  },
  insignias: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  footerFila: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonSeguir: {
    flex: 1,
  },
  botonReclamar: {
    flex: 1,
  },
  avisoSinConexion: {
    ...typography.caption,
    textAlign: 'center',
  },
});
