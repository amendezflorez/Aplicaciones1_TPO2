import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import BarrioPicker from '../../components/BarrioPicker';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PermisoDenegado from '../../components/PermisoDenegado';
import Screen from '../../components/Screen';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';
import { crearReclamo, subirFotoReclamo } from '../../services/reclamosService';
import { getBarrios } from '../../services/userService';

const PICKER_OPTIONS = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 };

// Formulario de "Es mío" / "Lo encontré" (Punto 4/7, lado de quien reclama). tipo,
// preguntaVerificacion e intentosRestantes llegan por params desde DetallePublicacionScreen
// (ya los tenía cargados, evita un segundo GET). Al enviar vuelve al detalle con goBack();
// ese screen se refresca solo con useFocusEffect, así ya ve "reclamo en curso".
export default function IniciarReclamoScreen({ route, navigation }) {
  const { id, tipo, preguntaVerificacion, intentosRestantes } = route.params;
  const esMio = tipo === 'es_mio';
  const toast = useToast();
  const { sinConexion } = useConnectivity();

  const [respuestaPregunta, setRespuestaPregunta] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  // null = sin problema; { puedePreguntar } = la cámara no tiene permiso.
  const [permisoCamara, setPermisoCamara] = useState(null);
  const [barrioId, setBarrioId] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [errorBarrios, setErrorBarrios] = useState('');
  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (esMio) return;
    getBarrios()
      .then(setBarrios)
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  }, [esMio]);

  const cargarBarrios = () => {
    setErrorBarrios('');
    getBarrios()
      .then(setBarrios)
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled && result.assets?.[0]?.uri) {
        setFotoUri(result.assets[0].uri);
        setPermisoCamara(null);
        setErrors((e) => ({ ...e, foto: undefined }));
      }
    } catch {
      toast.error('No pudimos abrir tu galería. Probá de nuevo.');
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPermisoCamara({ puedePreguntar: permission.canAskAgain !== false });
        return;
      }
      setPermisoCamara(null);
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled && result.assets?.[0]?.uri) {
        setFotoUri(result.assets[0].uri);
        setErrors((e) => ({ ...e, foto: undefined }));
      }
    } catch {
      toast.error('No pudimos abrir la cámara. Probá de nuevo o elegí una foto de la galería.');
    }
  };

  const validate = () => {
    const found = {};
    if (esMio && !preguntaVerificacion) {
      found.pregunta = 'Esta publicación no tiene una pregunta de verificación disponible.';
    }
    if (esMio && !respuestaPregunta.trim()) {
      found.respuestaPregunta = 'Respondé la pregunta para verificar que es tuyo.';
    }
    if (!esMio) {
      if (!fotoUri) found.foto = 'Sacale una foto a lo que encontraste.';
      if (!barrioId) found.barrio = 'Elegí dónde lo encontraste.';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const enviar = async () => {
    if (!validate()) return;
    setError('');
    setEnviando(true);
    try {
      const fotoUrl = fotoUri ? (await subirFotoReclamo(fotoUri)).photoUrl : undefined;
      const data = esMio
        ? {
            tipo,
            respuestaPregunta: respuestaPregunta.trim(),
            descripcion: descripcion.trim() || undefined,
            fotoUrl,
          }
        : {
            tipo,
            barrioId,
            descripcion: descripcion.trim() || undefined,
            fotoUrl,
          };
      await crearReclamo(id, data);
      toast.success('Reclamo enviado. Te avisamos cuando respondan.');
      navigation.goBack();
    } catch (e) {
      // El backend ya manda el motivo en español (máximo de intentos, publicación ya
      // resuelta, reclamo pendiente...): se muestra tal cual, sin pisarlo con un texto fijo.
      const mensaje = getErrorMessage(e);
      setError(mensaje);
      toast.error(mensaje);
    } finally {
      setEnviando(false);
    }
  };

  const textoIntentos =
    intentosRestantes == null
      ? null
      : `Te ${intentosRestantes === 1 ? 'queda 1 intento' : `quedan ${intentosRestantes} intentos`} para reclamar esta publicación.`;

  const footer = (
    <>
      {sinConexion ? <Text style={styles.avisoSinConexion}>Necesitás conexión para enviar el reclamo.</Text> : null}
      <Button title="Enviar reclamo" icon="send" onPress={enviar} loading={enviando} disabled={sinConexion} />
    </>
  );

  return (
    <Screen
      title={esMio ? '¿Es tuyo?' : '¿Lo encontraste?'}
      subtitle={
        esMio
          ? 'Respondé la pregunta de verificación para demostrar que es tuyo.'
          : 'Mandá una foto y contanos dónde lo encontraste. El dueño lo va a revisar.'
      }
      footer={footer}
    >
      {textoIntentos ? <InlineMessage tone="info" message={textoIntentos} /> : null}

      {esMio ? (
        <>
          {preguntaVerificacion ? (
            <Card style={styles.pregunta} elevated={false}>
              <View style={styles.preguntaCabecera}>
                <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
                <Text style={styles.preguntaEtiqueta}>Pregunta de verificación</Text>
              </View>
              <Text style={styles.preguntaTexto}>{preguntaVerificacion}</Text>
            </Card>
          ) : null}
          {errors.pregunta ? <InlineMessage tone="error" message={errors.pregunta} /> : null}
          <TextField
            label="Tu respuesta"
            placeholder="Escribí la respuesta"
            value={respuestaPregunta}
            onChangeText={setRespuestaPregunta}
            error={errors.respuestaPregunta}
            multiline
            autoCapitalize="sentences"
          />
          <FotoReclamo
            titulo="Foto (opcional)"
            ayuda="Sumá una foto si ayuda a comprobar que es tuyo."
            fotoUri={fotoUri}
            onCamara={takePhoto}
            onGaleria={pickFromGallery}
            onQuitar={() => setFotoUri(null)}
            permisoCamara={permisoCamara}
          />
        </>
      ) : (
        <>
          <FotoReclamo
            titulo="Foto de lo que encontraste"
            obligatoria
            fotoUri={fotoUri}
            onCamara={takePhoto}
            onGaleria={pickFromGallery}
            onQuitar={() => setFotoUri(null)}
            permisoCamara={permisoCamara}
            error={errors.foto}
          />
          {errorBarrios ? (
            <View style={styles.errorBarrios}>
              <InlineMessage tone="error" message={`No pudimos cargar los barrios. ${errorBarrios}`} />
              <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" onPress={cargarBarrios} />
            </View>
          ) : null}
          <BarrioPicker
            label="¿Dónde lo encontraste?"
            placeholder="Elegí el barrio"
            barrios={barrios}
            selectedId={barrioId}
            onSelect={(b) => {
              setBarrioId(b.id);
              setErrors((e) => ({ ...e, barrio: undefined }));
            }}
            error={errors.barrio}
          />
        </>
      )}

      <TextField
        label="Descripción (opcional)"
        placeholder="Algún detalle más que ayude a confirmar…"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
        autoCapitalize="sentences"
      />

      {error ? <InlineMessage tone="error" message={error} /> : null}
    </Screen>
  );
}

// Foto del reclamo: vista previa, cámara/galería y, si la cámara no tiene permiso, el flujo
// de PermisoDenegado (explica, deja elegir de la galería y abre la configuración).
function FotoReclamo({ titulo, ayuda, obligatoria, fotoUri, onCamara, onGaleria, onQuitar, permisoCamara, error }) {
  return (
    <View style={styles.foto}>
      <Text style={styles.fotoTitulo}>
        {titulo}
        {obligatoria ? <Text style={styles.obligatoria}> *</Text> : null}
      </Text>
      {ayuda ? <Text style={styles.fotoAyuda}>{ayuda}</Text> : null}

      {fotoUri ? (
        <View>
          <Image source={{ uri: fotoUri }} style={styles.fotoPreview} accessibilityLabel="Foto seleccionada" />
          <Pressable
            onPress={onQuitar}
            hitSlop={8}
            style={styles.quitarFoto}
            accessibilityRole="button"
            accessibilityLabel="Quitar foto"
          >
            <Ionicons name="close" size={18} color={colors.white} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.fotoVacia, error && styles.fotoVaciaError]}>
          <Ionicons name="camera-outline" size={34} color={error ? colors.error : colors.textMuted} />
          <Text style={styles.fotoVaciaTexto}>Todavía no agregaste ninguna foto</Text>
        </View>
      )}

      {permisoCamara ? (
        <PermisoDenegado
          titulo="Necesitamos acceso a la cámara"
          motivo="Para sacar la foto desde la app necesitamos permiso de cámara. También podés elegir una foto de tu galería."
          puedePreguntar={permisoCamara.puedePreguntar}
          onPedirPermiso={onCamara}
          alternativaLabel="Elegir de la galería"
          onAlternativa={onGaleria}
        />
      ) : (
        <View style={styles.fotoBotones}>
          <Button
            title={fotoUri ? 'Sacar otra' : 'Cámara'}
            icon="camera"
            variant="secondary"
            onPress={onCamara}
            style={styles.fotoBoton}
          />
          <Button title="Galería" icon="images-outline" variant="secondary" onPress={onGaleria} style={styles.fotoBoton} />
        </View>
      )}
      {error ? <InlineMessage tone="error" message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pregunta: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  preguntaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  preguntaEtiqueta: {
    ...typography.overline,
    color: colors.primary,
  },
  preguntaTexto: {
    ...typography.title,
    color: colors.primaryDark,
  },
  foto: {
    gap: spacing.sm,
  },
  fotoTitulo: {
    ...typography.label,
  },
  obligatoria: {
    color: colors.error,
  },
  fotoAyuda: {
    ...typography.caption,
  },
  fotoPreview: {
    width: '100%',
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  quitarFoto: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoVacia: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
  },
  fotoVaciaError: {
    borderColor: colors.error,
  },
  fotoVaciaTexto: {
    ...typography.caption,
  },
  fotoBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fotoBoton: {
    flex: 1,
  },
  errorBarrios: {
    gap: spacing.sm,
  },
  avisoSinConexion: {
    ...typography.caption,
    textAlign: 'center',
  },
});
