import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ClaimCard from '../../components/ClaimCard';
import Screen from '../../components/Screen';
import { useAuth } from '../../hooks/useAuth';
import { useClaims } from '../../hooks/useClaims';
import { colors, spacing } from '../../config/theme';

export default function MyClaimsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { claims, myClaims, receivedClaims, refreshClaims } = useClaims();

  useFocusEffect(
    useCallback(() => {
      refreshClaims();
    }, [refreshClaims])
  );

  const allVisibleClaims = useMemo(
    () =>
      [...claims].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      ),
    [claims]
  );

  if (!user) {
    return null;
  }

  return (
    <Screen>
      <Text style={styles.title}>Mis reclamos</Text>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Enviados ({myClaims.length})</Text>
        {myClaims.length === 0 ? (
          <Text style={styles.empty}>Todavía no enviaste reclamos.</Text>
        ) : (
          myClaims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onPress={() => navigation.navigate('ClaimDetail', { claimId: claim.id })}
            />
          ))
        )}
      </View>

      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Recibidos ({receivedClaims.length})</Text>
        {receivedClaims.length === 0 ? (
          <Text style={styles.empty}>No tenés reclamos pendientes.</Text>
        ) : (
          receivedClaims.map((claim) => (
            <ClaimCard
              key={claim.id}
              claim={claim}
              onPress={() => navigation.navigate('ClaimDetail', { claimId: claim.id })}
            />
          ))
        )}
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
  sectionContainer: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
