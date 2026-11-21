import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/Button';
import PermisoDenegado from '../../components/PermisoDenegado';
import Screen from '../../components/Screen';
import { CardSkeleton, InlineMessage } from '../../components/StateViews';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useReclamos } from '../../hooks/useReclamos';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';
import { decodeQrFromImage } from '../../services/qrImageDecoder';
import { confirmarDevolucion } from '../../services/reclamosService';
import { formatFechaHora } from '../../utils/publicacionFormatters';
import { rolesReclamo } from '../../utils/reclamoRoles';

const TAMANO_MARCO = 250;
// Evita repetir el aviso de "QR incorrecto" mientras la cámara sigue apuntando al mismo código.
const ESPERA_AVISO_MS = 3000;

// Punto 11: quien recupera el objeto escanea el QR que le muestra (o tiene impreso) quien lo
// devuelve. Al confirmarse, el backend pasa la publicación a "resuelta".
export default function ConfirmarDevolucionScreen({ navigation, route }) {
  const { publicacionId, reclamoId } = route.params;
  const toast = useToast();
  const { user } = useAuth();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { reclamos, refresh } = useReclamos();
  const [procesando, setProcesando] = useState(false);
  const [leyendoImagen, setLeyendoImagen] = useState(false);
  const [error, setError] = useState('');
  const [errorCamara, setErrorCamara] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const bloqueado = useRef(false);
  const ultimoAviso = useRef(0);
  const solicitudInicial = useRef(false);
  const [escala] = useState(() => new Animated.Value(0.4));

  const reclamo = reclamos.find((item) => item.id === reclamoId);
  const otraParte = reclamo ? rolesReclamo(reclamo, user?.id).otro.nombre : null;

  // Primera vez: pide el permiso apenas se abre la pantalla (si todavía se puede preguntar).
  useEffect(() => {
    if (!permission || permission.granted || !permission.canAskAgain || solicitudInicial.current) return;
    solicitudInicial.current = true;
    requestPermission().catch(() => {});
  }, [permission, requestPermission]);

  // Si la persona fue a Configuración a habilitar la cámara, al volver se vuelve a consultar.
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') getPermission().catch(() => {});
    });
    return () => suscripcion.remove();
  }, [getPermission]);

  useEffect(() => {
    if (!confirmacion) return;
    Animated.spring(escala, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [confirmacion, escala]);

  const avisarError = useCallback((mensaje) => {
    setError(mensaje);
    toast.error(mensaje);
  }, [toast]);

  const confirmarCodigo = useCallback(async (payload) => {
    if (bloqueado.current) return;
    const codigo = typeof payload === 'string' ? payload.trim() : '';
    if (!codigo || codigo !== publicacionId) {
      const ahora = Date.now();
      if (ahora - ultimoAviso.current > ESPERA_AVISO_MS) {
        ultimoAviso.current = ahora;
        avisarError('Ese QR no corresponde a esta publicación. Pedile a la otra persona que te muestre el correcto.');
      }
      return;
    }

    bloqueado.current = true;
    setProcesando(true);
    setError('');
    try {
      const resultado = await confirmarDevolucion(publicacionId, reclamoId);
      setConfirmacion(resultado);
      toast.success('Devolución confirmada. La publicación quedó resuelta.');
      refresh();
    } catch (requestError) {
      avisarError(getErrorMessage(requestError));
      bloqueado.current = false;
    } finally {
      setProcesando(false);
    }
  }, [publicacionId, reclamoId, refresh, toast, avisarError]);

  const elegirImagen = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        avisarError('No pudimos abrir esa imagen. Elegí otra foto del código QR.');
        return;
      }
      setLeyendoImagen(true);
      const payload = await decodeQrFromImage(asset.uri, asset.width, asset.height);
      if (!payload) {
        avisarError('No encontramos un QR legible en esa imagen. Probá con una foto más nítida y de frente.');
        return;
      }
      ultimoAviso.current = 0;
      await confirmarCodigo(payload);
    } catch {
      avisarError('No pudimos leer esa imagen. Probá con otra.');
    } finally {
      setLeyendoImagen(false);
    }
  };

  // --- Éxito ---
  if (confirmacion) {
    return (
      <Screen
        footer={(
          <>
            <Button
              title={otraParte ? `Valorar a ${otraParte}` : 'Valorar la experiencia'}
              icon="star-outline"
              onPress={() => navigation.navigate('Perfil', { screen: 'Historial' })}
            />
            <Button title="Volver a mis reclamos" variant="secondary" onPress={() => navigation.popToTop()} />
          </>
        )}
      >
        <View style={styles.success}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: escala }] }]}>
            <Ionicons name="checkmark" size={72} color={colors.white} />
          </Animated.View>
          <Text style={[typography.display, styles.center]}>¡Devolución confirmada!</Text>
          <Text style={[typography.body, styles.center, styles.muted]}>
            La publicación quedó resuelta
            {confirmacion.fechaResolucion ? ` el ${formatFechaHora(confirmacion.fechaResolucion)}` : ''}.
            {' '}La otra persona también lo verá en sus reclamos.
          </Text>
          <Text style={[typography.body, styles.center, styles.muted]}>
            Ya podés valorar la experiencia desde tu historial: tenés 7 días.
          </Text>
        </View>
      </Screen>
    );
  }

  // --- Permiso de cámara ---
  if (!permission) {
    return (
      <Screen>
        <CardSkeleton count={1} />
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <PermisoDenegado
          titulo="Necesitamos usar tu cámara"
          motivo="La cámara se usa solo para escanear el código QR que te muestra la otra persona y confirmar que recibiste tu objeto. Si preferís, podés elegir una imagen del QR desde tu galería."
          puedePreguntar={permission.canAskAgain}
          onPedirPermiso={() => requestPermission().catch(() => {})}
          alternativaLabel="Elegir imagen del QR"
          onAlternativa={elegirImagen}
        />
        {leyendoImagen ? <InlineMessage tone="info" message="Leyendo la imagen…" /> : null}
        {error ? <InlineMessage tone="error" message={error} /> : null}
      </Screen>
    );
  }

  // --- Escáner ---
  const ocupado = procesando || leyendoImagen;
  return (
    <View style={styles.scanner}>
      {/* La cámara se monta solo con la pantalla enfocada (libera el recurso al navegar). */}
      {isFocused ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={ocupado ? undefined : ({ data }) => confirmarCodigo(data)}
          onMountError={(cameraError) => setErrorCamara(cameraError?.message || 'No pudimos iniciar la cámara.')}
        />
      ) : null}

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.guide}>
          <Text style={styles.guideText}>Apuntá al código QR de la publicación</Text>
        </View>
        <View style={styles.frame}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>
      </View>

      <View style={styles.bottom}>
        {errorCamara ? <InlineMessage tone="error" message={errorCamara} /> : null}
        {error && !errorCamara ? <InlineMessage tone="error" message={error} /> : null}
        <Button
          title="Elegir imagen del QR"
          icon="images-outline"
          variant="secondary"
          onPress={elegirImagen}
          loading={leyendoImagen}
          disabled={procesando}
        />
      </View>

      {procesando ? (
        <View style={styles.progress}>
          <Text style={styles.progressText}>Confirmando entrega…</Text>
        </View>
      ) : null}
    </View>
  );
}

const ESQUINA = 36;
const styles = StyleSheet.create({
  scanner: { flex: 1, backgroundColor: colors.text },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  guide: {
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.round,
  },
  guideText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  frame: { width: TAMANO_MARCO, height: TAMANO_MARCO },
  corner: { position: 'absolute', width: ESQUINA, height: ESQUINA, borderColor: colors.white },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: radius.md },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: radius.md },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: radius.md },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: radius.md },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.md,
    gap: spacing.sm,
  },
  progress: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.overlay,
  },
  progressText: { color: colors.white, fontSize: 17, fontWeight: '700' },
  success: { alignItems: 'center', gap: spacing.md, paddingTop: spacing.xl },
  successCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  center: { textAlign: 'center' },
  muted: { color: colors.textSecondary },
});
