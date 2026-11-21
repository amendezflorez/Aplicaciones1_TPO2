import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AgradecimientosList from '../../components/AgradecimientosList';
import Button from '../../components/Button';
import Card from '../../components/Card';
import InfoRow from '../../components/InfoRow';
import MenuRow from '../../components/MenuRow';
import ProfileHeader from '../../components/ProfileHeader';
import ReputationSummary from '../../components/ReputationSummary';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { InlineMessage } from '../../components/StateViews';
import { spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../services/errors';
import { getMe } from '../../services/userService';

export default function ProfileScreen({ navigation }) {
  const { user, updateUser, logout } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');
  const enCurso = useRef(false);

  // Trae /users/me para tener reputación e insignias al día (cambian cuando otra persona
  // valora o se concreta una devolución). Si falla, se sigue mostrando lo que ya hay en
  // el contexto pero se avisa, para no mostrar datos viejos sin decirlo.
  const refrescar = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    try {
      updateUser(await getMe());
      setError('');
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      enCurso.current = false;
    }
  }, [updateUser]);

  useFocusEffect(
    useCallback(() => {
      refrescar();
    }, [refrescar])
  );

  const handlePullRefresh = async () => {
    setRefreshing(true);
    await refrescar();
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  };

  const confirmarLogout = () => {
    Alert.alert('Cerrar sesión', '¿Querés cerrar tu sesión en este dispositivo?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <Screen onRefresh={handlePullRefresh} refreshing={refreshing}>
      {error ? (
        <InlineMessage tone="warning" message={`No pudimos actualizar tu perfil. ${error}`} />
      ) : null}

      <ProfileHeader
        photoUrl={user?.photoUrl}
        name={user?.name}
        subtitle={user?.email}
        barrio={user?.barrio?.name}
        memberSince={user?.memberSince}
      />

      <ReputationSummary reputation={user?.reputation} badges={user?.badges} esPropio />

      <SectionHeader title="Contacto" />
      <Card style={styles.contact}>
        <InfoRow icon="call-outline" label="Teléfono" value={user?.phone || 'Sin teléfono cargado'} />
        <InfoRow
          icon={user?.phoneVisible ? 'eye-outline' : 'eye-off-outline'}
          label="Visibilidad"
          value={
            user?.phoneVisible
              ? 'Se muestra a la otra parte cuando se acepta un reclamo.'
              : 'No se muestra: te contactan solo a través de la app.'
          }
        />
      </Card>

      {user?.id ? <AgradecimientosList userId={user.id} refreshKey={refreshKey} esPropio /> : null}

      <SectionHeader title="Mi cuenta" />
      <Card padded={false} style={styles.menu}>
        <MenuRow icon="create-outline" title="Editar perfil" subtitle="Nombre, foto, barrio y teléfono" onPress={() => navigation.navigate('EditProfile')} />
        <MenuRow icon="time-outline" title="Historial de casos" subtitle="Devoluciones y recuperos" onPress={() => navigation.navigate('Historial')} />
        <MenuRow icon="settings-outline" title="Configuración" subtitle="Desbloqueo con biometría" onPress={() => navigation.navigate('Settings')} separator={false} />
      </Card>

      <View style={styles.logout}>
        <Button title="Cerrar sesión" icon="log-out-outline" variant="danger" onPress={confirmarLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contact: {
    gap: spacing.md,
  },
  menu: {
    overflow: 'hidden',
  },
  logout: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
});
