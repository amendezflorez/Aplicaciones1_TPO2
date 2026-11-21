import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AgradecimientosList from '../../components/AgradecimientosList';
import ProfileHeader from '../../components/ProfileHeader';
import ReputationSummary from '../../components/ReputationSummary';
import Screen from '../../components/Screen';
import { ErrorState, Skeleton } from '../../components/StateViews';
import { radius, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { getPublicProfile } from '../../services/userService';

// Se abre con navigation.navigate('PublicProfile', { userId })
// Solo muestra reputación, insignias, antigüedad y agradecimientos públicos: nunca teléfono
// ni historial de publicaciones (consigna, Punto 2).
export default function PublicProfileScreen({ route }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const traer = useCallback(
    () =>
      getPublicProfile(userId)
        .then((data) => {
          setProfile(data);
          setError('');
        })
        .catch((e) => setError(getErrorMessage(e, { 404: 'Este perfil no existe o ya no está disponible.' })))
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        }),
    [userId]
  );

  useEffect(() => {
    traer();
  }, [traer]);

  const reintentar = () => {
    setError('');
    setLoading(true);
    traer();
  };

  const refrescar = () => {
    setRefreshing(true);
    traer();
  };

  if (loading) {
    return (
      <Screen>
        <Skeleton height={250} radius={radius.xl} />
        <Skeleton height={220} radius={radius.lg} />
      </Screen>
    );
  }

  if (error && !profile) {
    return (
      <Screen>
        <ErrorState
          title="No pudimos cargar el perfil"
          message={error}
          onRetry={reintentar}
        />
      </Screen>
    );
  }

  return (
    <Screen onRefresh={refrescar} refreshing={refreshing}>
      <ProfileHeader
        photoUrl={profile.photoUrl}
        name={profile.name}
        barrio={profile.barrio?.name}
        memberSince={profile.memberSince}
      />
      <ReputationSummary reputation={profile.reputation} badges={profile.badges} />
      <View style={styles.gap}>
        <AgradecimientosList userId={userId} refreshKey={refreshing ? 1 : 0} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: {
    gap: spacing.sm,
  },
});
