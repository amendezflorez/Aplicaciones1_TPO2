import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/Button';
import Card from '../../components/Card';
import FotoPublicacion from '../../components/FotoPublicacion';
import PermisoDenegado from '../../components/PermisoDenegado';
import PuntoEncuentroCard from '../../components/PuntoEncuentroCard';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { CardSkeleton, EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import TimelineDevolucion from '../../components/TimelineDevolucion';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useReclamos } from '../../hooks/useReclamos';
import { useToast } from '../../hooks/useToast';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { getErrorMessage } from '../../services/errors';
import { formatCoordenadas, formatFechaHora } from '../../utils/publicacionFormatters';
import { rolesReclamo } from '../../utils/reclamoRoles';

const INTERVALO_ACTUALIZACION_MS = 15000;

// Pasos hechos según el estado del encuentro y de la publicación.
function pasosCompletados(estadoEncuentro, resuelta) {
  if (resuelta) return 4;
  if (estadoEncuentro === 'acordado') return 3;
  if (estadoEncuentro === 'pendiente') return 2;
  return 1;
}

export default function PuntoEncuentroScreen({ navigation, route }) {
  const { reclamoId } = route.params;
  const toast = useToast();
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const { reclamos, cargado, encuentros, cargarEncuentro, proponerUbicacion, aceptarUbicacion } = useReclamos();
  const gps = useUbicacionActual();

  const reclamo = reclamos.find((item) => item.id === reclamoId);
  const encuentro = encuentros[reclamoId];
  const [cargando, setCargando] = useState(!encuentro);
  const [errorCarga, setErrorCarga] = useState('');
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [coords, setCoords] = useState(null);
  const [errorDireccion, setErrorDireccion] = useState('');
  const [proponiendoOtro, setProponiendoOtro] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aceptando, setAceptando] = useState(false);

  const resuelta = reclamo?.publicacionEstado === 'resuelta';
  const habilitado = reclamo?.estado === 'aceptado' && !resuelta;

  const actualizar = useCallback(async () => {
    try {
      await cargarEncuentro(reclamoId);
      setErrorCarga('');
    } catch (requestError) {
      setErrorCarga(getErrorMessage(requestError));
    } finally {
      setCargando(false);
    }
  }, [cargarEncuentro, reclamoId]);

  // Mientras la pantalla está enfocada, se refresca cada 15 s (la otra parte puede haber
  // propuesto o aceptado). El polling no muestra spinner: solo la primera carga.
  useFocusEffect(
    useCallback(() => {
      if (!habilitado) {
        setCargando(false);
        return undefined;
      }
      actualizar();
      const intervalo = setInterval(actualizar, INTERVALO_ACTUALIZACION_MS);
      return () => clearInterval(intervalo);
    }, [actualizar, habilitado])
  );

  const roles = reclamo ? rolesReclamo(reclamo, user?.id) : null;
  const propuesta = encuentro?.propuestaActual;
  const esProponente = propuesta?.propuestoPorId === user?.id;
  const estadoEncuentro = encuentro?.estado;
  const hayPropuestaPendiente = estadoEncuentro === 'pendiente';
  const acordado = estadoEncuentro === 'acordado' && encuentro?.ubicacionAcordada;
  const puedeAceptar = hayPropuestaPendiente && !esProponente;
  const mostrarFormulario = !resuelta && !acordado && (
    (estadoEncuentro === 'sin_propuesta' && roles?.soyTitular)
    || (puedeAceptar && proponiendoOtro)
  );
  const telefono = reclamo?.contraparteTelefono;

  const usarMiUbicacion = async () => {
    const posicion = await gps.obtenerUbicacion();
    if (!posicion) return;
    setCoords(posicion);
    setErrorDireccion('');
    if (!direccion.trim()) {
      // Sugerencia editable de dirección a partir de las coordenadas.
      try {
        const [lugar] = await Location.reverseGeocodeAsync({ latitude: posicion.lat, longitude: posicion.lng });
        const calle = [lugar?.street, lugar?.streetNumber].filter(Boolean).join(' ');
        const sugerida = calle || [lugar?.district, lugar?.city].filter(Boolean).join(', ');
        setDireccion(sugerida || 'Mi ubicación actual');
      } catch {
        setDireccion('Mi ubicación actual');
      }
    }
    toast.info('Ubicación adjunta a la propuesta.');
  };

  const enviarPropuesta = async () => {
    const direccionLimpia = direccion.trim();
    if (direccionLimpia.length < 5) {
      setErrorDireccion('Ingresá una dirección o un lugar reconocible (mínimo 5 letras).');
      return;
    }
    setErrorDireccion('');
    setGuardando(true);
    try {
      await proponerUbicacion(reclamoId, {
        direccion: direccionLimpia,
        referencia: referencia.trim() || null,
        latitud: coords?.lat ?? null,
        longitud: coords?.lng ?? null,
      });
      setDireccion('');
      setReferencia('');
      setCoords(null);
      setProponiendoOtro(false);
      gps.limpiarUbicacion();
      toast.success('Propuesta enviada. Te avisamos cuando la otra persona responda.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
      actualizar();
    } finally {
      setGuardando(false);
    }
  };

  const aceptarPropuesta = async () => {
    if (!propuesta?.id) return;
    setAceptando(true);
    try {
      await aceptarUbicacion(reclamoId, propuesta.id);
      toast.success('Punto de encuentro acordado. Ya pueden coordinar la entrega.');
    } catch (requestError) {
      toast.error(getErrorMessage(requestError));
      actualizar();
    } finally {
      setAceptando(false);
    }
  };

  const abrirEnlace = async (url, mensaje) => {
    try {
      await Linking.openURL(url);
    } catch {
      toast.error(mensaje);
    }
  };

  const irAQr = () => {
    if (roles.soyTitular) {
      navigation.navigate('MostrarQr', {
        publicacionId: reclamo.publicacionId,
        titulo: reclamo.publicacionTitulo,
        reclamoId: reclamo.id,
      });
    } else {
      navigation.navigate('ConfirmarDevolucion', {
        publicacionId: reclamo.publicacionId,
        reclamoId: reclamo.id,
      });
    }
  };

  // --- Estados de pantalla (uno solo a la vez) ---
  if (!reclamo) {
    return (
      <Screen>
        {cargado ? (
          <EmptyState
            icon="help-circle-outline"
            title="No encontramos este reclamo"
            message="Volvé a Mis reclamos y actualizá la lista."
            actionLabel="Volver a mis reclamos"
            onAction={() => navigation.popToTop()}
          />
        ) : (
          <CardSkeleton count={2} />
        )}
      </Screen>
    );
  }

  if (reclamo.estado !== 'aceptado') {
    return (
      <Screen>
        <EmptyState
          icon="lock-closed-outline"
          title="La devolución todavía no está habilitada"
          message="El reclamo tiene que estar aceptado para coordinar un encuentro."
          actionLabel="Volver a mis reclamos"
          onAction={() => navigation.popToTop()}
        />
      </Screen>
    );
  }

  const encabezado = (
    <Card style={styles.pubCard}>
      <FotoPublicacion url={reclamo.publicacionFotoUrl} style={styles.thumb} />
      <View style={styles.pubTexts}>
        <Text style={typography.overline}>Devolución</Text>
        <Text style={typography.subheading} numberOfLines={2}>{reclamo.publicacionTitulo}</Text>
        <Text style={typography.caption}>
          {roles.soyTitular ? 'Entregás a' : 'Recuperás con'} {roles.otro.nombre || 'la otra persona'}
        </Text>
      </View>
    </Card>
  );

  if (resuelta) {
    return (
      <Screen>
        {encabezado}
        <Card>
          <TimelineDevolucion completados={4} detalles={{ 3: reclamo.fechaResolucion ? formatFechaHora(reclamo.fechaResolucion) : undefined }} />
        </Card>
        <InlineMessage
          tone="success"
          message={`La entrega ya fue confirmada y la publicación quedó resuelta${reclamo.fechaResolucion ? ` el ${formatFechaHora(reclamo.fechaResolucion)}` : ''}.`}
        />
      </Screen>
    );
  }

  if (cargando && !encuentro) {
    return (
      <Screen>
        {encabezado}
        <CardSkeleton count={2} />
      </Screen>
    );
  }

  if (errorCarga && !encuentro) {
    return (
      <Screen>
        {encabezado}
        <ErrorState title="No pudimos cargar la coordinación" message={errorCarga} onRetry={actualizar} />
      </Screen>
    );
  }

  // Detalle de cada paso en la línea de tiempo.
  const detalles = {};
  if (propuesta) detalles[1] = `${esProponente ? 'Propusiste' : `${roles.otro.nombre || 'La otra persona'} propuso`}: ${propuesta.direccion}`;
  else detalles[1] = roles.soyTitular ? 'Te toca proponer un lugar' : `Esperando que ${roles.otro.nombre || 'la otra persona'} proponga un lugar`;
  if (hayPropuestaPendiente) detalles[2] = esProponente ? 'Esperando que la otra persona acepte' : 'Aceptá el punto o proponé otro';
  if (acordado) detalles[3] = roles.soyTitular ? 'Mostrale el QR a la otra persona' : 'Escaneá el QR para confirmar';

  // Acción principal en el pie de la pantalla.
  let footer = null;
  if (mostrarFormulario) {
    footer = (
      <>
        <Button title="Enviar propuesta" icon="send" onPress={enviarPropuesta} loading={guardando} disabled={sinConexion} />
        {proponiendoOtro ? (
          <Button title="Cancelar" variant="ghost" onPress={() => setProponiendoOtro(false)} disabled={guardando} />
        ) : null}
      </>
    );
  } else if (puedeAceptar) {
    footer = (
      <>
        <Button title="Aceptar este punto" icon="checkmark" onPress={aceptarPropuesta} loading={aceptando} disabled={sinConexion} />
        <Button title="Proponer otro lugar" variant="secondary" icon="swap-horizontal" onPress={() => setProponiendoOtro(true)} disabled={aceptando || sinConexion} />
      </>
    );
  } else if (acordado) {
    footer = (
      <Button
        title={roles.soyTitular ? 'Mostrar QR de entrega' : 'Escanear QR para confirmar'}
        icon={roles.soyTitular ? 'qr-code-outline' : 'scan-outline'}
        onPress={irAQr}
      />
    );
  }

  return (
    <Screen footer={footer} onRefresh={actualizar} refreshing={false}>
      {encabezado}
      {sinConexion ? (
        <InlineMessage tone="warning" message="Sin conexión: necesitás internet para proponer o aceptar un punto." />
      ) : null}
      {errorCarga ? <InlineMessage tone="warning" message="No pudimos actualizar. Mostramos lo último que cargamos." /> : null}

      <Card>
        <TimelineDevolucion completados={pasosCompletados(estadoEncuentro, false)} detalles={detalles} />
      </Card>

      {acordado ? (
        <>
          <SectionHeader title="Punto de encuentro acordado" />
          <PuntoEncuentroCard ubicacion={encuentro.ubicacionAcordada} titulo="Lugar de la devolución" destacado />
          <InlineMessage tone="info" message="Elegí un lugar público y con gente. Si algo no te cierra, no concretes el encuentro." />
        </>
      ) : null}

      {hayPropuestaPendiente && propuesta && !acordado ? (
        <>
          <SectionHeader title={esProponente ? 'Tu propuesta' : 'Propuesta recibida'} />
          <PuntoEncuentroCard ubicacion={propuesta} titulo={`Propuesto por ${esProponente ? 'vos' : roles.otro.nombre || 'la otra persona'}`} />
          {esProponente ? (
            <InlineMessage tone="info" message="Esperando que la otra persona acepte o sugiera otro lugar." />
          ) : null}
        </>
      ) : null}

      {estadoEncuentro === 'sin_propuesta' && !roles.soyTitular ? (
        <InlineMessage tone="info" message="La persona que tiene el objeto todavía no propuso un punto de encuentro. Te avisamos cuando lo haga." />
      ) : null}

      {mostrarFormulario ? (
        <>
          <SectionHeader title={hayPropuestaPendiente ? 'Tu punto alternativo' : 'Proponé un punto de encuentro'} />
          <View style={styles.form}>
            <TextField
              label="Dirección o lugar"
              icon="location-outline"
              placeholder="Ej: Av. Cabildo 2040"
              value={direccion}
              onChangeText={(texto) => { setDireccion(texto); setErrorDireccion(''); }}
              error={errorDireccion}
              maxLength={180}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            <TextField
              label="Referencia, día y hora (opcional)"
              icon="time-outline"
              placeholder="Ej: Sábado 15 hs, en el subte"
              value={referencia}
              onChangeText={setReferencia}
              maxLength={180}
              autoCapitalize="sentences"
            />
            {coords ? (
              <View style={styles.coordsRow}>
                <Text style={[typography.label, styles.coordsText]}>
                  Ubicación adjunta: {formatCoordenadas(coords.lat, coords.lng)}
                </Text>
                <Button title="Quitar" size="sm" variant="ghost" onPress={() => setCoords(null)} />
              </View>
            ) : null}
            {gps.error?.tipo === 'permiso' ? (
              <PermisoDenegado
                icon="location-outline"
                titulo="Necesitamos tu ubicación"
                motivo="La usamos solo para adjuntar el punto exacto al encuentro. Podés escribir la dirección a mano o habilitar el permiso desde la configuración."
              />
            ) : gps.error ? (
              <InlineMessage tone="warning" message={gps.error.mensaje} />
            ) : null}
            <Button
              title={coords ? 'Actualizar mi ubicación' : 'Usar mi ubicación'}
              icon="locate"
              variant="secondary"
              onPress={usarMiUbicacion}
              loading={gps.cargando}
            />
          </View>
        </>
      ) : null}

      {telefono ? (
        <>
          <SectionHeader title={`Contactar a ${roles.otro.nombre || 'la otra persona'}`} />
          <View style={styles.contact}>
            <Button
              title="Llamar"
              icon="call-outline"
              variant="secondary"
              style={styles.flex}
              onPress={() => abrirEnlace(`tel:${telefono}`, 'No pudimos abrir el teléfono.')}
            />
            <Button
              title="WhatsApp"
              icon="logo-whatsapp"
              variant="secondary"
              style={styles.flex}
              onPress={() => abrirEnlace(`https://wa.me/${String(telefono).replace(/\D/g, '')}`, 'No pudimos abrir WhatsApp.')}
            />
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pubCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  pubTexts: { flex: 1, gap: spacing.xxs },
  form: {
    gap: spacing.md - 4,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  coordsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  coordsText: { flex: 1 },
  contact: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
