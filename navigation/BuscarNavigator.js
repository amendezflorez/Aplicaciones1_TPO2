import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuscadorInicialScreen from '../screens/buscar/BuscadorInicialScreen';
import DetallePublicacionScreen from '../screens/buscar/DetallePublicacionScreen';
import IniciarReclamoScreen from '../screens/buscar/IniciarReclamoScreen';
import ResultadosScreen from '../screens/buscar/ResultadosScreen';
import { stackScreenOptions } from '../config/theme';
import { renderCampana } from './renderCampana';


const Stack = createNativeStackNavigator();

// Punto 3 (buscador/resultados) y Punto 4 (detalle + iniciar reclamo).
export default function BuscarNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions} initialRouteName="BuscadorInicial">
      <Stack.Screen
        name="BuscadorInicial"
        component={BuscadorInicialScreen}
        options={{ title: 'Buscar', headerRight: renderCampana }}
      />
      <Stack.Screen name="Resultados" component={ResultadosScreen} options={{ title: 'Resultados' }} />
      <Stack.Screen
        name="DetallePublicacion"
        component={DetallePublicacionScreen}
        options={{ title: 'Publicación' }}
      />
      <Stack.Screen
        name="IniciarReclamo"
        component={IniciarReclamoScreen}
        options={{ title: 'Iniciar reclamo' }}
      />
    </Stack.Navigator>
  );
}
