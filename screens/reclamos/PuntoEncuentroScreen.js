import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import OfflineBanner from '../../components/OfflineBanner';
import PuntoEncuentroCard from '../../components/PuntoEncuentroCard';
import { colors, radius, spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useReclamos } from '../../hooks/useReclamos';
import { getErrorMessage } from '../../services/errors';

const INTERVALO_ACTUALIZACION_MS = 15000;

function mensajeDeError(error, overrides) {
  return error?.response?.data?.message || getErrorMessage(error, overrides);
}

export default function PuntoEncuentroScreen({ route }) {
  const { reclamoId } = route.params;
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const {
    reclamos,
    encuentros,
    cargarEncuentro,
    proponerUbicacion,
    aceptarUbicacion,
  } = useReclamos();
  const [direccion, setDireccion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [cargando, setCargando] = useState(!encuentros[reclamoId]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      let activa = true;
      const actualizar = async () => {
        try {
          await cargarEncuentro(reclamoId);
          if (activa) setError('');
        } catch (requestError) {
          if (activa) setError(mensajeDeError(requestError));
        } finally {
          if (activa) setCargando(false);
        }
      };

      actualizar();
      const intervalo = setInterval(actualizar, INTERVALO_ACTUALIZACION_MS);
      return () => {
        activa = false;
        clearInterval(intervalo);
      };
    }, [cargarEncuentro, reclamoId])
  );

  const reclamo = reclamos.find((item) => item.id === reclamoId);
  const encuentro = encuentros[reclamoId];
  const propuesta = encuentro?.propuestaActual;
  const titularId = reclamo?.tipo === 'lo_encontre' ? reclamo.autorId : reclamo?.publicadorId;
  const esProponente = propuesta?.propuestoPorId === user?.id;
  const hayPropuestaPendiente = encuentro?.estado === 'pendiente';
  const puedeProponer = encuentro?.estado === 'sin_propuesta'
    ? titularId === user?.id
    : hayPropuestaPendiente && !esProponente;
  const puedeAceptar = hayPropuestaPendiente && !esProponente;

  const enviarPropuesta = async () => {
    const direccionLimpia = direccion.trim();
    if (direccionLimpia.length < 5) {
      setError('Ingresá una dirección o lugar reconocible.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      await proponerUbicacion(reclamoId, {
        direccion: direccionLimpia,
        referencia: referencia.trim() || null,
      });
      setDireccion('');
      setReferencia('');
    } catch (requestError) {
      const mensaje = mensajeDeError(requestError);
      setError(mensaje);
      Alert.alert('No se pudo enviar la propuesta', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  const aceptarPropuesta = async () => {
    if (!propuesta?.id) return;
    setGuardando(true);
    setError('');
    try {
      await aceptarUbicacion(reclamoId, propuesta.id);
    } catch (requestError) {
      const mensaje = mensajeDeError(requestError, {
        409: 'La propuesta pudo haber cambiado. Actualizá el encuentro e intentá nuevamente.',
      });
      setError(mensaje);
      Alert.alert('No se pudo aceptar la propuesta', mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (!reclamo) {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>No encontramos este reclamo</Text>
        <Text style={styles.body}>Volvé a la bandeja y actualizá la lista.</Text>
      </View>
    );
  }

  if (reclamo.estado !== 'aceptado') {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>La devolución todavía no está habilitada</Text>
        <Text style={styles.body}>El reclamo debe estar aceptado para coordinar un encuentro.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <OfflineBanner />
      <View style={styles.heading}>
        <Text style={styles.title}>{reclamo.publicacionTitulo}</Text>
        <Text style={styles.body}>Acordá un lugar público y seguro para realizar la devolución.</Text>
      </View>

      {cargando && !encuentro ? <Text style={styles.body}>Cargando coordinación...</Text> : null}
      <ErrorText message={error} />

      {encuentro?.estado === 'acordado' && encuentro.ubicacionAcordada ? (
        <>
          <Text style={styles.sectionTitle}>Encuentro acordado</Text>
          <PuntoEncuentroCard ubicacion={encuentro.ubicacionAcordada} titulo="Lugar de devolución" />
        </>
      ) : null}

      {hayPropuestaPendiente && propuesta ? (
        <>
          <Text style={styles.sectionTitle}>Propuesta actual</Text>
          <PuntoEncuentroCard ubicacion={propuesta} />
          {puedeAceptar ? (
            <View style={styles.actions}>
              <Button
                title="Aceptar este punto"
                onPress={aceptarPropuesta}
                loading={guardando}
                disabled={sinConexion}
              />
              <Text style={styles.orText}>o sugerí una alternativa</Text>
            </View>
          ) : (
            <Text style={styles.body}>Esperando que la otra persona acepte o sugiera otro lugar.</Text>
          )}
        </>
      ) : null}

      {encuentro?.estado === 'sin_propuesta' && titularId !== user?.id ? (
        <Text style={styles.body}>La persona que tiene el objeto todavía no propuso un punto de encuentro.</Text>
      ) : null}

      {puedeProponer ? (
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>
            {hayPropuestaPendiente ? 'Punto alternativo' : 'Proponé un punto de encuentro'}
          </Text>
          <TextInput
            accessibilityLabel="Dirección o lugar"
            style={styles.input}
            placeholder="Dirección o nombre del lugar"
            placeholderTextColor={colors.textMuted}
            value={direccion}
            onChangeText={setDireccion}
            maxLength={180}
            returnKeyType="next"
          />
          <TextInput
            accessibilityLabel="Referencia opcional"
            style={[styles.input, styles.multiline]}
            placeholder="Referencia (opcional)"
            placeholderTextColor={colors.textMuted}
            value={referencia}
            onChangeText={setReferencia}
            maxLength={180}
            multiline
          />
          <Button
            title="Enviar propuesta"
            onPress={enviarPropuesta}
            loading={guardando}
            disabled={sinConexion}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: spacing.md, paddingBottom: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.background },
  heading: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 20, fontWeight: '700' },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  actions: { gap: spacing.sm },
  orText: { color: colors.textMuted, textAlign: 'center', fontSize: 13 },
  form: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.white },
  multiline: { minHeight: 72, paddingTop: spacing.sm, textAlignVertical: 'top' },
});