import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

// Los demás integrantes agregan aquí sus tabs (Buscar, Mis publicaciones, Mis reclamos...).
export default function AppNavigator() {
  return (
    <Tab.Navigator initialRouteName="Perfil" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Perfil" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
