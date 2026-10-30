import { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import BarrioPicker from '../../components/BarrioPicker';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { colors, radius, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { crearReclamo, subirFotoReclamo } from '../../services/reclamosService';
import { getBarrios } from '../../services/userService';

const PICKER_OPTIONS = { mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 };

// Formulario de "Es mío" / "Lo encontré" (sección 4.4 del plan). tipo y
// preguntaVerificacion llegan por params desde DetallePublicacionScreen (ya los tenía
// cargados, evita un segundo GET). Vuelve al detalle con goBack(); ese screen se refresca
// solo via useFocusEffect.
export default function IniciarReclamoScreen({ route, navigation }) {
  const { id, tipo, preguntaVerificacion } = route.params;
  const esMio = tipo === 'es_mio';

  const [respuestaPregunta, setRespuestaPregunta] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fotoUri, setFotoUri] = useState(null);
  const [barrioId, setBarrioId] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [errors, setErrors] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!esMio) {
      getBarrios()
        .then(setBarrios)
        .catch((e) => setError(getErrorMessage(e)));
    }
  }, [esMio]);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets?.[0]?.uri) setFotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Habilitá el acceso a la cámara para tomar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets?.[0]?.uri) setFotoUri(result.assets[0].uri);
  };

  const pickOptionalPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets?.[0]?.uri) setFotoUri(result.assets[0].uri);
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
      const data = esMio
        ? {
            tipo,
            respuestaPregunta: respuestaPregunta.trim(),
            descripcion: descripcion.trim() || undefined,
            fotoUrl: fotoUri ? (await subirFotoReclamo(fotoUri)).photoUrl : undefined,
          }
        : {
            tipo,
            barrioId,
            descripcion: descripcion.trim() || undefined,
            fotoUrl: (await subirFotoReclamo(fotoUri)).photoUrl,
          };
      await crearReclamo(id, data);
      navigation.goBack();
    } catch (e) {
      setError(getErrorMessage(e, { 409: 'Ya alcanzaste el máximo de intentos sobre esta publicación.' }));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.titulo}>{esMio ? '¿Es tuyo?' : '¿Lo encontraste?'}</Text>

      {esMio ? (
        <>
          {preguntaVerificacion ? (
            <View style={styles.preguntaBox}>
              <Text style={styles.preguntaTitulo}>Pregunta de verificación</Text>
              <Text style={styles.pregunta}>{preguntaVerificacion}</Text>
            </View>
          ) : null}
          <ErrorText message={errors.pregunta} />
          <TextField
            label="Tu respuesta"
            value={respuestaPregunta}
            onChangeText={setRespuestaPregunta}
            error={errors.respuestaPregunta}
            multiline
          />
          <View style={styles.fotoSection}>
            {fotoUri ? <Image source={{ uri: fotoUri }} style={styles.fotoPreview} /> : null}
            <Button
              title={fotoUri ? 'Cambiar foto opcional' : 'Agregar foto opcional'}
              variant="secondary"
              onPress={pickOptionalPhoto}
            />
          </View>
        </>
      ) : (
        <>
          <View style={styles.fotoSection}>
            {fotoUri ? <Image source={{ uri: fotoUri }} style={styles.fotoPreview} /> : null}
            <View style={styles.fotoBotones}>
              <Button title="Cámara" variant="secondary" onPress={takePhoto} />
              <Button title="Galería" variant="secondary" onPress={pickFromGallery} />
            </View>
            <ErrorText message={errors.foto} />
          </View>
          <BarrioPicker barrios={barrios} selectedId={barrioId} onSelect={(b) => setBarrioId(b.id)} error={errors.barrio} />
        </>
      )}

      <TextField
        label="Descripción (opcional)"
        placeholder="Algún detalle más que ayude a confirmar…"
        value={descripcion}
        onChangeText={setDescripcion}
        multiline
      />

      <ErrorText message={error} />
      <Button title="Enviar" onPress={enviar} loading={enviando} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  preguntaBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  preguntaTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  pregunta: {
    fontSize: 15,
    color: colors.text,
  },
  fotoSection: {
    gap: spacing.sm,
  },
  fotoPreview: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
  },
  fotoBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
