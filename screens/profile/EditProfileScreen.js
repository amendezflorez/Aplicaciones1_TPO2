import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Avatar from '../../components/Avatar';
import BarrioPicker from '../../components/BarrioPicker';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { colors, spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../services/errors';
import { getBarrios, updateMe, uploadPhoto } from '../../services/userService';
import { isValidName, isValidPhone } from '../../utils/validators';

const PICKER_OPTIONS = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 };

export default function EditProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [phoneVisible, setPhoneVisible] = useState(user?.phoneVisible ?? false);
  const [barrioId, setBarrioId] = useState(user?.barrio?.id ?? null);
  const [barrios, setBarrios] = useState([]);
  const [newPhotoUri, setNewPhotoUri] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBarrios()
      .then(setBarrios)
      .catch((e) => setSaveError(getErrorMessage(e)));
  }, []);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled) setNewPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Habilitá el acceso a la cámara para tomar la foto.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    if (!result.canceled) setNewPhotoUri(result.assets[0].uri);
  };

  const validate = () => {
    const found = {};
    if (!isValidName(name)) found.name = 'Ingresá tu nombre.';
    if (!barrioId) found.barrio = 'Elegí tu barrio.';
    if (phone.trim() && !isValidPhone(phone)) found.phone = 'Ingresá un teléfono válido.';
    setErrors(found);
    return Object.keys(found).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaveError('');
    setSaving(true);
    try {
      let updated = await updateMe({
        name: name.trim(),
        barrioId,
        phone: phone.trim() || null,
        phoneVisible,
      });
      if (newPhotoUri) {
        const { photoUrl } = await uploadPhoto(newPhotoUri);
        updated = { ...updated, photoUrl };
      }
      updateUser(updated);
      navigation.goBack();
    } catch (e) {
      setSaveError(getErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Screen>
      <View style={styles.photo}>
        <Avatar uri={newPhotoUri ?? user?.photoUrl} name={name} />
        <View style={styles.photoButtons}>
          <Button title="Cámara" variant="secondary" onPress={takePhoto} />
          <Button title="Galería" variant="secondary" onPress={pickFromGallery} />
        </View>
      </View>

      <TextField
        label="Nombre"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        error={errors.name}
      />
      <BarrioPicker
        barrios={barrios}
        selectedId={barrioId}
        onSelect={(barrio) => setBarrioId(barrio.id)}
        error={errors.barrio}
      />
      <TextField
        label="Teléfono de contacto"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        error={errors.phone}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>
          Mostrar mi teléfono a la otra parte una vez aceptado un reclamo
        </Text>
        <Switch value={phoneVisible} onValueChange={setPhoneVisible} />
      </View>
      <Text style={styles.hint}>
        Si lo dejás apagado, la comunicación es solo a través de la app.
      </Text>

      <ErrorText message={saveError} />
      <Button title="Guardar" onPress={handleSave} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    alignItems: 'center',
    gap: spacing.md,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  switchLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  hint: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
