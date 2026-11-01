import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../config/theme';
import AlertasNavigator from './AlertasNavigator';
import BuscarNavigator from './BuscarNavigator';
import ProfileNavigator from './ProfileNavigator';
import PublicarNavigator from './PublicarNavigator';
import ReclamosNavigator from './ReclamosNavigator';

const Tab = createBottomTabNavigator();

// Un ícono por tab (@expo/vector-icons, ya viene con Expo — sin instalar nada fuera del
// programa de la materia): sin "tabBarIcon", @react-navigation/bottom-tabs v7 renderiza su
// propio "MissingIcon" de aviso (un cuadrado vacío) en vez de no mostrar nada.
const ICONOS = {
  Buscar: 'search',
  Publicar: 'add-circle',
  Alertas: 'notifications',
  Reclamos: 'flag',
  Perfil: 'person',
};

function tabBarIcon(nombre) {
  const TabIcon = ({ color, size, focused }) => (
    <Ionicons name={focused ? ICONOS[nombre] : `${ICONOS[nombre]}-outline`} size={size} color={color} />
  );
  TabIcon.displayName = `TabBarIcon_${nombre}`;
  return TabIcon;
}

// Tabs principales de la aplicación: Buscar, Publicar, Alertas (Punto 9), Reclamos, Perfil.
export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Buscar"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tab.Screen name="Buscar" component={BuscarNavigator} options={{ tabBarIcon: tabBarIcon('Buscar') }} />
      <Tab.Screen name="Publicar" component={PublicarNavigator} options={{ tabBarIcon: tabBarIcon('Publicar') }} />
      <Tab.Screen name="Alertas" component={AlertasNavigator} options={{ tabBarIcon: tabBarIcon('Alertas') }} />
      <Tab.Screen name="Reclamos" component={ReclamosNavigator} options={{ tabBarIcon: tabBarIcon('Reclamos') }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator} options={{ tabBarIcon: tabBarIcon('Perfil') }} />
    </Tab.Navigator>
  );
}
