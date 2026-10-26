import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Avatar from '../../components/Avatar';
import ErrorText from '../../components/ErrorText';
import Loading from '../../components/Loading';
import ReputationSummary from '../../components/ReputationSummary';
import Screen from '../../components/Screen';
import { colors, spacing } from '../../config/theme';
import { getErrorMessage } from '../../services/errors';
import { getPublicProfile } from '../../services/userService';
import { formatMemberSince } from '../../utils/formatters';

// Se abre con navigation.navigate('PublicProfile', { userId })
// Solo muestra reputación, insignias y antigüedad: nunca teléfono ni historial.
export default function PublicProfileScreen({ route }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPublicProfile(userId)
      .then(setProfile)
      .catch((e) => setError(getErrorMessage(e)));
  }, [userId]);

  if (error) {
    return (
      <Screen>
        <ErrorText message={error} />
      </Screen>
    );
  }

  if (!profile) return <Loading />;

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar uri={profile.photoUrl} name={profile.name} />
        <Text style={styles.name}>{profile.name}</Text>
        {profile.barrio?.name ? <Text style={styles.muted}>📍 {profile.barrio.name}</Text> : null}
        <Text style={styles.muted}>{formatMemberSince(profile.memberSince)}</Text>
      </View>
      <ReputationSummary reputation={profile.reputation} badges={profile.badges} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  muted: {
    fontSize: 13,
    color: colors.textMuted,
  },
});
