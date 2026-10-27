import { useNavigation, useRoute } from '@react-navigation/native';
import { Alert, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Screen from '../../components/Screen';
import { useAuth } from '../../hooks/useAuth';
import { useClaims } from '../../hooks/useClaims';
import { colors, radius, spacing } from '../../config/theme';

export default function ClaimDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { claims, decideClaim } = useClaims();
  const claim = claims.find((item) => item.id === route.params?.claimId);

  if (!claim) {
    return (
      <Screen>
        <Text style={styles.empty}>No se encontró el reclamo.</Text>
      </Screen>
    );
  }

  const canDecide = claim.targetUserId === user?.id && claim.status === 'pendiente';

  const handleDecision = async (status) => {
    try {
      await decideClaim(claim.id, status, user.id, status === 'rechazado' ? 'No coincide con el objeto.' : 'Aceptado por el propietario.');
      Alert.alert('Estado actualizado', `El reclamo quedó en ${status}.`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el reclamo.');
    }
  };

  const openMap = () => {
    const destination = claim.meeting?.address || claim.barrio || 'Buenos Aires';
    const query = encodeURIComponent(destination);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  return (
    <Screen>
      <Text style={styles.title}>{claim.type === 'is_mine' ? 'Reclamo por pertenencia' : 'Reclamo por objeto encontrado'}</Text>
      <Text style={styles.status}>Estado: {claim.status}</Text>

      {claim.photoUri ? (
        <Image source={{ uri: claim.photoUri }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.card}>
        <Text style={styles.label}>Descripción</Text>
        <Text style={styles.value}>{claim.description || claim.verificationAnswer || 'Sin descripción'}</Text>

        <Text style={styles.label}>Barrio</Text>
        <Text style={styles.value}>{claim.barrio || 'No indicado'}</Text>

        {claim.meeting ? (
          <>
            <Text style={styles.label}>Punto de encuentro</Text>
            <Text style={styles.value}>{claim.meeting.address}</Text>
            <TouchableOpacity style={styles.mapButton} onPress={openMap}>
              <Text style={styles.mapButtonText}>Cómo llegar</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      {canDecide ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.acceptButton} onPress={() => handleDecision('aceptado')}>
            <Text style={styles.acceptButtonText}>Aceptar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectButton} onPress={() => handleDecision('rechazado')}>
            <Text style={styles.rejectButtonText}>Rechazar</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  status: {
    color: colors.primaryDark,
    fontWeight: '700',
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
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  value: {
    color: colors.textMuted,
    lineHeight: 20,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    marginBottom: spacing.md,
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
  rejectButton: {
    flex: 1,
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: colors.white,
    fontWeight: '800',
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
  empty: {
    color: colors.textMuted,
  },
});
