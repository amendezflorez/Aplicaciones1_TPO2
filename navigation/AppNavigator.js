import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import ClaimsNavigator from './ClaimsNavigator';
import ProfileNavigator from './ProfileNavigator';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator initialRouteName="Perfil" screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Perfil" component={ProfileNavigator} />
      <Tab.Screen name="Reclamos" component={ClaimsNavigator} />
    </Tab.Navigator>
  );
}
