import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MisPublicacionesScreen from '../screens/publicar/MisPublicacionesScreen';
import PublicarWizardScreen from '../screens/publicar/PublicarWizardScreen';

const Stack = createNativeStackNavigator();

// Punto 5 (publicar + "Mis publicaciones", ver .docs/PLAN_puntos_5_y_6.md). "Mis
// publicaciones" es la pantalla inicial de la tab: mismo criterio que ReclamosNavigator,
// donde la bandeja es la puerta de entrada y el formulario (acá, el wizard) se abre desde
// ahí, no al revés.
export default function PublicarNavigator() {
  return (
    <Stack.Navigator initialRouteName="MisPublicaciones">
      <Stack.Screen
        name="MisPublicaciones"
        component={MisPublicacionesScreen}
        // headerBackVisible explícito: al llegar acá por navegación cruzada desde otra
        // tab (navigation.navigate('Publicar', { screen: 'MisPublicaciones' }) desde
        // DetallePublicacionScreen) native-stack a veces infiere que hay "algo antes" en
        // el historial y dibuja una flecha de todas formas, aunque sea la primera pantalla
        // de este stack y no haya a dónde volver dentro de él.
        options={{ title: 'Mis publicaciones', headerBackVisible: false }}
      />
      <Stack.Screen name="PublicarWizard" component={PublicarWizardScreen} options={{ title: 'Publicar' }} />
    </Stack.Navigator>
  );
}
