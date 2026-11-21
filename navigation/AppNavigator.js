import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../config/theme';
import { useBadgesTabs } from '../hooks/useBadgesTabs';
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
  // 'bookmark' y no 'notifications': la campana es de la bandeja de notificaciones (Punto 12).
  Alertas: 'bookmark',
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
  const badges = useBadgesTabs();
  return (
    <Tab.Navigator
      initialRouteName="Buscar"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.white, fontSize: 10, fontWeight: '800' },
      }}
    >
      <Tab.Screen name="Buscar" component={BuscarNavigator} options={{ tabBarIcon: tabBarIcon('Buscar') }} />
      <Tab.Screen name="Publicar" component={PublicarNavigator} options={{ tabBarIcon: tabBarIcon('Publicar') }} />
      <Tab.Screen name="Alertas" component={AlertasNavigator} options={{ tabBarIcon: tabBarIcon('Alertas'), tabBarBadge: badges.alertas > 0 ? badges.alertas : undefined }} />
      <Tab.Screen name="Reclamos" component={ReclamosNavigator} options={{ tabBarIcon: tabBarIcon('Reclamos'), tabBarBadge: badges.reclamos > 0 ? badges.reclamos : undefined }} />
      <Tab.Screen name="Perfil" component={ProfileNavigator} options={{ tabBarIcon: tabBarIcon('Perfil') }} />
    </Tab.Navigator>
  );
}
