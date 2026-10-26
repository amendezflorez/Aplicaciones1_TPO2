import { StyleSheet, Text, View } from 'react-native';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import ReputationSummary from '../../components/ReputationSummary';
import Screen from '../../components/Screen';
import { colors, spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { formatMemberSince } from '../../utils/formatters';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Avatar uri={user?.photoUrl} name={user?.name} />
        <Text style={styles.name}>{user?.name || 'Completá tu nombre'}</Text>
        <Text style={styles.muted}>{user?.email}</Text>
        <Text style={styles.muted}>{formatMemberSince(user?.memberSince)}</Text>
      </View>

      <View style={styles.data}>
        <Text style={styles.row}>📍 {user?.barrio?.name || 'Sin barrio'}</Text>
        <Text style={styles.row}>📞 {user?.phone || 'Sin teléfono'}</Text>
        <Text style={styles.muted}>
          {user?.phoneVisible
            ? 'Tu teléfono se muestra a la otra parte cuando se acepta un reclamo.'
            : 'Te contactan solo a través de la app.'}
        </Text>
      </View>

      <ReputationSummary reputation={user?.reputation} badges={user?.badges} />

      <Button title="Editar perfil" onPress={() => navigation.navigate('EditProfile')} />
      <Button
        title="Configuración"
        variant="secondary"
        onPress={() => navigation.navigate('Settings')}
      />
      <Button title="Cerrar sesión" variant="secondary" onPress={logout} />
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
  data: {
    gap: spacing.xs,
  },
  row: {
    fontSize: 16,
    color: colors.text,
  },
});
