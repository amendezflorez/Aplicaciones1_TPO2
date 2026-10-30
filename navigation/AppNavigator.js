import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import BuscarNavigator from './BuscarNavigator';
import ProfileNavigator from './ProfileNavigator';
import ReclamosNavigator from './ReclamosNavigator';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator initialRouteName="Buscar" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Buscar" component={BuscarNavigator} />
      <Tab.Screen name="Reclamos" component={ReclamosNavigator} />
      <Tab.Screen name="Perfil" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}
