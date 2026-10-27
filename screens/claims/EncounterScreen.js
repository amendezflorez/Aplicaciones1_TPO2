import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { useClaims } from '../../hooks/useClaims';
import { colors, radius, spacing } from '../../config/theme';

export default function EncounterScreen() {
  const route = useRoute();
  const { addMeetingProposal, answerMeeting, claims } = useClaims();
  const claim = claims.find((item) => item.id === route.params?.claimId);
  const [address, setAddress] = useState(claim?.meeting?.address || '');
  const [notes, setNotes] = useState(claim?.meeting?.notes || '');

  if (!claim) {
    return (
      <Screen>
        <Text style={styles.empty}>No se encontró el reclamo.</Text>
      </Screen>
    );
  }

  const handleOpenMap = async () => {
    const query = encodeURIComponent(address || claim.barrio || 'Buenos Aires');
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    await Linking.openURL(url);
  };

  const handleAccept = async () => {
    try {
      await answerMeeting(claim.id, 'accept', { address, notes, latitude: -34.6037, longitude: -58.3816 });
      Alert.alert('Punto de encuentro aceptado');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo aceptar el punto de encuentro.');
    }
  };

  const handleCounter = async () => {
    try {
      await addMeetingProposal(claim.id, {
        address,
        notes,
        latitude: -34.6037,
        longitude: -58.3816,
        proposedBy: 'user-current',
      });
      Alert.alert('Propuesta enviada', 'Se envió una alternativa de encuentro.');
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo sugerir un punto alternativo.');
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Punto de encuentro</Text>
      <Text style={styles.subtitle}>Acordemos un lugar seguro para la devolución.</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Dirección</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Ej: Av. Santa Fe 2000, CABA"
        />

        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Indicá detalles del encuentro, horario o referencias."
          multiline
        />
      </View>

      <TouchableOpacity style={styles.mapButton} onPress={handleOpenMap}>
        <Text style={styles.mapButtonText}>Cómo llegar</Text>
      </TouchableOpacity>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.acceptButton} onPress={handleAccept}>
          <Text style={styles.acceptButtonText}>Aceptar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.counterButton} onPress={handleCounter}>
          <Text style={styles.counterButtonText}>Sugerir otro</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: spacing.md,
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
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  mapButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  mapButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.white,
    fontWeight: '800',
  },
  counterButton: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  counterButtonText: {
    color: colors.white,
    fontWeight: '800',
  },
  empty: {
    color: colors.textMuted,
  },
});
