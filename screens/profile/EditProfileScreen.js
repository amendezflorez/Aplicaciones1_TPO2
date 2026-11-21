import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Avatar from '../../components/Avatar';
import BarrioPicker from '../../components/BarrioPicker';
import Button from '../../components/Button';
import Card from '../../components/Card';
import PermisoDenegado from '../../components/PermisoDenegado';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { colors, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';
import { getBarrios, updateMe, uploadPhoto } from '../../services/userService';
import { isValidName, isValidPhone } from '../../utils/validators';

const PICKER_OPTIONS = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };
const NOMBRE_MAX = 80;

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const { sinConexion } = useConnectivity();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneVisible, setPhoneVisible] = useState(user?.phoneVisible ?? false);
  const [barrioId, setBarrioId] = useState(user?.barrio?.id ?? null);
  const [barrios, setBarrios] = useState([]);
  const [barriosError, setBarriosError] = useState('');
  const [newPhotoUri, setNewPhotoUri] = useState(null);
  // { tipo: 'camara' | 'galeria', puedePreguntar } cuando falta un permiso.
  const [permiso, setPermiso] = useState(null);
  const [errors, setErrors] = useState({});
  const [aviso, setAviso] = useState({ tone: 'error', message: '' });
  const [saving, setSaving] = useState(false);

  const traerBarrios = () =>
    getBarrios()
      .then((data) => {
        setBarrios(data);
        setBarriosError('');
      })
      .catch((e) => setBarriosError(getErrorMessage(e)));

  useEffect(() => {
    traerBarrios();
  }, []);

  const reintentarBarrios = () => {
    setBarriosError('');
    traerBarrios();
  };

  const huboCambios =
    name.trim() !== (user?.name ?? '') ||
    phone.trim() !== (user?.phone ?? '') ||
    phoneVisible !== (user?.phoneVisible ?? false) ||
    barrioId !== (user?.barrio?.id ?? null) ||
    !!newPhotoUri;

  const pickFromGallery = async () => {
    setPermiso(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setPermiso({ tipo: 'galeria', puedePreguntar: perm.canAskAgain });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (!result.canceled) setNewPhotoUri(result.assets[0].uri);
    } catch {
      toast.error('No pudimos abrir la galería. Intentá de nuevo.');
    }
  };

  const takePhoto = async () => {
    setPermiso(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setPermiso({ tipo: 'camara', puedePreguntar: perm.canAskAgain });
        return;
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (!result.canceled) setNewPhotoUri(result.assets[0].uri);
    } catch {
      toast.error('No pudimos abrir la cámara. Intentá de nuevo.');
    }
  };

  const validate = () => {
    const found = {};
    if (!isValidName(name)) found.name = 'Ingresá tu nombre (al menos 2 letras).';
    else if (name.trim().length > NOMBRE_MAX) found.name = `El nombre no puede superar los ${NOMBRE_MAX} caracteres.`;
    if (!barrioId) found.barrio = 'Elegí tu barrio.';
    if (phone.trim() && !isValidPhone(phone)) {
      found.phone = 'Ingresá un teléfono válido: entre 8 y 15 dígitos, puede empezar con +.';
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setAviso({ tone: 'error', message: '' });
    setSaving(true);

    // 1) Datos del perfil. Si esto falla no se guardó nada.
    let updated;
    try {
      // phone '' le indica al backend que borre el teléfono (null = "no tocar").
      updated = await updateMe({ name: name.trim(), barrioId, phone: phone.trim(), phoneVisible });
    } catch (e) {
      const message = getErrorMessage(e);
      setAviso({ tone: 'error', message });
      toast.error(message);
      setSaving(false);
      return;
    }
    // Los datos ya están guardados: el contexto se actualiza ahora, aunque la foto falle.
    updateUser(updated);

    // 2) Foto (opcional). Si falla, el perfil igual quedó guardado: avisamos y dejamos la
    // pantalla abierta con la foto elegida para poder reintentar.
    if (newPhotoUri) {
      try {
        const { photoUrl } = await uploadPhoto(newPhotoUri);
        updateUser({ photoUrl });
      } catch (e) {
        const message = `Guardamos tus datos, pero no pudimos subir la foto. ${getErrorMessage(e)}`;
        setAviso({ tone: 'warning', message });
        toast.error('Datos guardados, pero la foto no se pudo subir.');
        setSaving(false);
        return;
      }
    }

    toast.success('Perfil actualizado.');
    setSaving(false);
    navigation.goBack();
  };

  return (
    <Screen
      footer={
        <>
          {sinConexion ? (
            <Text style={styles.offline}>Sin conexión: necesitás internet para guardar los cambios.</Text>
          ) : null}
          <Button
            title="Guardar cambios"
            icon="checkmark"
            onPress={handleSave}
            loading={saving}
            disabled={sinConexion || !huboCambios}
          />
        </>
      }
    >
      <View style={styles.photo}>
        <View>
          <Avatar uri={newPhotoUri ?? user?.photoUrl} name={name} size={112} ring />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={colors.white} />
          </View>
        </View>
        <Text style={styles.photoHint}>
          {newPhotoUri ? 'Foto nueva lista: se sube al guardar.' : 'Tocá una opción para cambiar tu foto.'}
        </Text>
        <View style={styles.photoButtons}>
          <Button title="Sacar foto" icon="camera-outline" variant="secondary" size="sm" onPress={takePhoto} />
          <Button title="Galería" icon="images-outline" variant="secondary" size="sm" onPress={pickFromGallery} />
        </View>
      </View>

      {permiso ? (
        <PermisoDenegado
          icon={permiso.tipo === 'camara' ? 'camera-outline' : 'images-outline'}
          titulo={permiso.tipo === 'camara' ? 'Necesitamos acceso a la cámara' : 'Necesitamos acceso a tus fotos'}
          motivo={
            permiso.tipo === 'camara'
              ? 'Lo usamos solo para sacar tu foto de perfil. También podés elegir una de tu galería.'
              : 'Lo usamos solo para elegir tu foto de perfil. También podés sacarte una con la cámara.'
          }
          puedePreguntar={permiso.puedePreguntar}
          onPedirPermiso={permiso.tipo === 'camara' ? takePhoto : pickFromGallery}
          alternativaLabel={permiso.tipo === 'camara' ? 'Elegir de la galería' : 'Sacar una foto'}
          onAlternativa={permiso.tipo === 'camara' ? pickFromGallery : takePhoto}
        />
      ) : null}

      <SectionHeader title="Datos personales" />
      <TextField
        label="Nombre"
        icon="person-outline"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        maxLength={NOMBRE_MAX}
        error={errors.name}
      />
      <View>
        <BarrioPicker
          barrios={barrios}
          selectedId={barrioId}
          onSelect={(barrio) => setBarrioId(barrio.id)}
          error={errors.barrio}
        />
        {barriosError ? (
          <View style={styles.barriosError}>
            <InlineMessage tone="error" message={`No pudimos cargar los barrios. ${barriosError}`} />
            <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" onPress={reintentarBarrios} style={styles.retry} />
          </View>
        ) : null}
      </View>

      <SectionHeader title="Contacto" />
      <TextField
        label="Teléfono de contacto (opcional)"
        icon="call-outline"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+54 11 1234-5678"
        helper="Dejalo vacío si preferís no cargarlo."
        error={errors.phone}
      />

      <Card style={styles.switchCard}>
        <View style={styles.switchRow}>
          <View style={styles.switchText}>
            <Text style={styles.switchLabel}>Mostrar mi teléfono</Text>
            <Text style={styles.hint}>
              Si lo activás, la otra parte lo ve una vez aceptado un reclamo. Apagado, la comunicación es solo a
              través de la app.
            </Text>
          </View>
          <Switch
            value={phoneVisible}
            onValueChange={setPhoneVisible}
            trackColor={{ true: colors.primary, false: colors.borderStrong }}
            accessibilityLabel="Mostrar mi teléfono a la otra parte"
          />
        </View>
      </Card>

      <InlineMessage tone={aviso.tone} message={aviso.message} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoHint: {
    ...typography.caption,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  switchCard: {
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  switchText: {
    flex: 1,
    gap: spacing.xs,
  },
  switchLabel: {
    ...typography.bodyStrong,
  },
  hint: {
    ...typography.caption,
  },
  offline: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
  },
  barriosError: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  retry: {
    alignSelf: 'flex-start',
  },
});
