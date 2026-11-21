import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import Button from '../../components/Button';
import { colors, spacing } from '../../config/theme';
import { useReclamos } from '../../hooks/useReclamos';
import { confirmarDevolucion } from '../../services/reclamosService';
import { getErrorMessage } from '../../services/errors';
import { decodeQrFromImage } from '../../services/qrImageDecoder';

function mensajeDeError(error) {
  return error?.response?.data?.message || getErrorMessage(error);
}

export default function ConfirmarDevolucionScreen({ navigation, route }) {
  const { publicacionId, reclamoId } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const isFocused = useIsFocused();
  const { refresh } = useReclamos();
  const [procesando, setProcesando] = useState(false);
  const [leyendoImagen, setLeyendoImagen] = useState(false);
  const [error, setError] = useState('');
  const [errorCamara, setErrorCamara] = useState('');
  const [confirmacion, setConfirmacion] = useState(null);
  const bloqueado = useRef(false);
  const solicitudInicial = useRef(false);

  useEffect(() => {
    if (!permission || permission.granted || solicitudInicial.current) return;
    solicitudInicial.current = true;
    requestPermission().catch((requestError) => {
      setError(mensajeDeError(requestError));
    });
  }, [permission, requestPermission]);

  const confirmarCodigo = useCallback(async (payload) => {
    const codigo = typeof payload === 'string' ? payload.trim() : '';
    if (!codigo || codigo !== publicacionId) {
      setError('El QR no corresponde a esta publicación. Verificá el código e intentá nuevamente.');
      return;
    }

    if (bloqueado.current) return;
    bloqueado.current = true;
    setProcesando(true);
    setError('');
    try {
      const resultado = await confirmarDevolucion(publicacionId, reclamoId);
      setConfirmacion(resultado);
      const listaActualizada = await refresh();
      if (!listaActualizada) {
        setError('La entrega quedó confirmada, pero no se pudo actualizar la bandeja. Volvé a cargar tus reclamos.');
      }
    } catch (requestError) {
      setError(mensajeDeError(requestError));
      bloqueado.current = false;
    } finally {
      setProcesando(false);
    }
  }, [publicacionId, reclamoId, refresh]);

  const elegirImagen = async () => {
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset?.uri) {
        setError('No se pudo abrir la imagen seleccionada. Elegí otra foto del código QR.');
        return;
      }

      setLeyendoImagen(true);
      const payload = await decodeQrFromImage(asset.uri, asset.width, asset.height);
      if (!payload) {
        setError('No encontramos un código QR legible en esa imagen. Probá con una foto más nítida.');
        return;
      }
      await confirmarCodigo(payload);
    } catch (decodeError) {
      setError(`No se pudo leer la imagen seleccionada: ${mensajeDeError(decodeError)}`);
    } finally {
      setLeyendoImagen(false);
    }
  };

  const abrirConfiguracion = async () => {
    try {
      await Linking.openSettings();
    } catch (settingsError) {
      Alert.alert('No se pudo abrir Configuración', mensajeDeError(settingsError));
    }
  };

  const solicitarPermiso = async () => {
    setError('');
    try {
      await requestPermission();
    } catch (requestError) {
      setError(mensajeDeError(requestError));
    }
  };

  if (confirmacion) {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.title}>¡Entrega confirmada!</Text>
        <Text style={styles.body}>
          La publicación quedó resuelta el {new Date(confirmacion.fechaResolucion).toLocaleString()}.
        </Text>
        <Text style={styles.body}>
          La otra persona también verá la confirmación en sus reclamos.
        </Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Button title="Volver a mis reclamos" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.body}>Verificando permiso de cámara…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {permission.granted && isFocused ? (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={procesando || leyendoImagen ? undefined : ({ data }) => confirmarCodigo(data)}
          onMountError={(cameraError) => setErrorCamara(cameraError.message)}
        />
      ) : (
        <View style={styles.permissionPanel}>
          <Text style={styles.title}>Necesitamos acceso a tu cámara</Text>
          <Text style={styles.body}>
            Usamos la cámara para escanear el código QR y confirmar que recibiste tu objeto.
          </Text>
          {permission.canAskAgain ? (
            <Button title="Permitir acceso a la cámara" onPress={solicitarPermiso} />
          ) : null}
          {!permission.canAskAgain ? (
            <Button title="Ya habilité la cámara" variant="secondary" onPress={solicitarPermiso} />
          ) : null}
          <Button
            title="Elegir una imagen del QR"
            variant="secondary"
            onPress={elegirImagen}
            loading={leyendoImagen}
          />
          <Button title="Abrir Configuración" variant="secondary" onPress={abrirConfiguracion} />
        </View>
      )}

      {permission.granted ? (
        <View style={styles.controls}>
          <Text style={styles.instructions}>Enfocá el código QR de la publicación.</Text>
          {errorCamara ? <Text style={styles.error}>{errorCamara}</Text> : null}
          <Button
            title="Leer QR desde una imagen"
            variant="secondary"
            onPress={elegirImagen}
            loading={leyendoImagen}
          />
          <Button
            title="Abrir Configuración"
            variant="secondary"
            onPress={abrirConfiguracion}
          />
        </View>
      ) : null}

      {procesando ? (
        <View style={styles.progress}>
          <ActivityIndicator color={colors.white} />
          <Text style={styles.progressText}>Validando entrega…</Text>
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  permissionPanel: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  camera: { flex: 1, minHeight: 260 },
  controls: { gap: spacing.sm, padding: spacing.md },
  instructions: { color: colors.text, textAlign: 'center', fontSize: 16 },
  title: { color: colors.text, fontSize: 21, fontWeight: '700', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  error: {
    color: colors.error,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    textAlign: 'center',
  },
  successIcon: { color: colors.success, fontSize: 56, fontWeight: '700' },
  progress: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#0F172A99',
  },
  progressText: { color: colors.white, fontWeight: '600' },
});
