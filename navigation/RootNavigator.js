import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import Loading from '../components/Loading';
import { stackScreenOptions } from '../config/theme';
import { useAuth } from '../hooks/useAuth';
import BiometricLockScreen from '../screens/auth/BiometricLockScreen';
import NotificacionesScreen from '../screens/notificaciones/NotificacionesScreen';
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';

const Stack = createNativeStackNavigator();

// Stack raíz de la sesión iniciada: las tabs + pantallas globales que se abren desde
// cualquier tab (la bandeja de notificaciones, Punto 12).
function SesionNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="Tabs" component={AppNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="Notificaciones" component={NotificacionesScreen} options={{ title: 'Notificaciones' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { status, user } = useAuth();

  switch (status) {
    case 'authenticated':
      return <SesionNavigator />;
    case 'locked':
      // Bloqueo al volver del segundo plano (ya hay sesión cargada): la pantalla de
      // bloqueo tapa la app sin desmontarla, así al desbloquear se sigue donde estaba (o
      // se abre la pantalla de la notificación tocada). En el arranque en frío no hay
      // usuario todavía: solo la pantalla de bloqueo.
      if (user) {
        return (
          <View style={styles.fill}>
            <SesionNavigator />
            <View style={StyleSheet.absoluteFill}>
              <BiometricLockScreen />
            </View>
          </View>
        );
      }
      return <BiometricLockScreen />;
    case 'unauthenticated':
      return <AuthNavigator />;
    default:
      return <Loading />;
  }
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
