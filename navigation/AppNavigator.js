import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../config/theme';
import BuscarNavigator from './BuscarNavigator';
import ProfileNavigator from './ProfileNavigator';
import PublicarNavigator from './PublicarNavigator';
import ReclamosNavigator from './ReclamosNavigator';

const Tab = createBottomTabNavigator();

// Un ícono por tab (@expo/vector-icons, ya viene con Expo — sin instalar nada fuera del
// programa de la materia): sin "tabBarIcon", @react-navigation/bottom-tabs v7 renderiza su
// propio "MissingIcon" de aviso (un cuadrado vacío) en vez de no mostrar nada, que es lo
// que se veía en las 4 tabs antes de este fix.
const ICONOS = {
  Buscar: 'search',
  Publicar: 'add-circle',
  Reclamos: 'flag',
  Perfil: 'person',
};

function tabBarIcon(nombre) {
  return ({ color, size, focused }) => (
    <Ionicons name={focused ? ICONOS[nombre] : `${ICONOS[nombre]}-outline`} size={size} color={color} />
  );
}

// "Publicar" (Punto 5) va como tab propia, entre Buscar y Reclamos: es una acción de
// primer nivel igual de importante que buscar, no una sub-sección de Perfil, y el TP la
// describe con su propia sección ("Mis publicaciones") igual que a Reclamos — mismo
// criterio que ya se usó para darle su tab propia a Reclamos en vez de colgarla de otra.
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
      <Tab.Screen name="Reclamos" component={ReclamosNavigator} options={{ tabBarIcon: tabBarIcon('Reclamos') }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator} options={{ tabBarIcon: tabBarIcon('Perfil') }} />
    </Tab.Navigator>
  );
}
