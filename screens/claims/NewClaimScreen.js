import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Screen from '../../components/Screen';
import { useAuth } from '../../hooks/useAuth';
import { useClaims } from '../../hooks/useClaims';
import { colors, radius, spacing } from '../../config/theme';

export default function NewClaimScreen({ route, navigation }) {
  const { user } = useAuth();
  const { submitClaim } = useClaims();
  const publicationId = route.params?.publicationId || 'pub-demo-1';
  const [claimType, setClaimType] = useState('is_mine');
  const [verificationAnswer, setVerificationAnswer] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [barrio, setBarrio] = useState('');
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permiso requerido', 'Necesitás permitir acceso a la galería para adjuntar la prueba.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'Necesitás iniciar sesión para reclamar.');
      return;
    }

    if (claimType === 'is_mine') {
      if (!verificationAnswer.trim()) {
        Alert.alert('Falta verificación', 'Debés responder la pregunta de verificación.');
        return;
      }
    }

    if (claimType === 'found') {
      if (!photoUri) {
        Alert.alert('Falta foto', 'Debés adjuntar una foto del objeto hallado.');
        return;
      }
      if (!barrio.trim()) {
        Alert.alert('Falta barrio', 'Debés indicar el barrio donde lo hallaste.');
        return;
      }
    }

    setLoading(true);
    try {
      await submitClaim({
        publicationId,
        type: claimType,
        targetUserId: 'user-2',
        verificationAnswer,
        description,
        barrio,
        photoUri,
      });
      Alert.alert('Reclamo enviado', 'Tu reclamo fue registrado correctamente.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo enviar el reclamo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Nuevo reclamo</Text>

      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentButton, claimType === 'is_mine' && styles.segmentButtonActive]}
          onPress={() => setClaimType('is_mine')}
        >
          <Text style={[styles.segmentText, claimType === 'is_mine' && styles.segmentTextActive]}>
            Es mío
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentButton, claimType === 'found' && styles.segmentButtonActive]}
          onPress={() => setClaimType('found')}
        >
          <Text style={[styles.segmentText, claimType === 'found' && styles.segmentTextActive]}>
            Lo encontré
          </Text>
        </TouchableOpacity>
      </View>

      {claimType === 'is_mine' ? (
        <View style={styles.card}>
          <Text style={styles.label}>Pregunta de verificación *</Text>
          <TextInput
            style={styles.input}
            value={verificationAnswer}
            onChangeText={setVerificationAnswer}
            placeholder="¿Qué detalle del objeto te permite verificar que es tuyo?"
            multiline
          />

          <Text style={styles.label}>Descripción opcional</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Agregá más detalles o contexto..."
            multiline
          />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Barrio donde lo hallaste *</Text>
          <TextInput
            style={styles.input}
            value={barrio}
            onChangeText={setBarrio}
            placeholder="Ej: Palermo"
          />

          <Text style={styles.label}>Foto del objeto *</Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
            <Text style={styles.photoButtonText}>Adjuntar foto</Text>
          </TouchableOpacity>

          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
          ) : null}
        </View>
      )}

      {claimType === 'is_mine' && (
        <View style={styles.card}>
          <Text style={styles.label}>Foto opcional de respaldo</Text>
          <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
            <Text style={styles.photoButtonText}>Elegir imagen</Text>
          </TouchableOpacity>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
          ) : null}
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>{loading ? 'Enviando...' : 'Enviar reclamo'}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  segmentButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  segmentButtonActive: {
    backgroundColor: colors.primary,
  },
  segmentText: {
    color: colors.text,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.white,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  photoButton: {
    backgroundColor: colors.primaryDark,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  photoButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  previewImage: {
    height: 180,
    borderRadius: radius.md,
    width: '100%',
  },
  submitButton: {
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 16,
  },
});
