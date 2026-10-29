import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BuscarNavigator from './BuscarNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

// Los demás integrantes agregan aquí sus tabs (Mis publicaciones, Mis reclamos...).
export default function AppNavigator() {
  return (
    <Tab.Navigator initialRouteName="Buscar" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Buscar" component={BuscarNavigator} />
      <Tab.Screen name="Perfil" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
