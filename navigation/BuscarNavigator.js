import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuscadorInicialScreen from '../screens/buscar/BuscadorInicialScreen';
import DetallePublicacionScreen from '../screens/buscar/DetallePublicacionScreen';
import ResultadosScreen from '../screens/buscar/ResultadosScreen';

const Stack = createNativeStackNavigator();

// Punto 3 (buscador/resultados) y Punto 4 (detalle). DetallePublicacionScreen es por
// ahora un placeholder (ver comentario en ese archivo) hasta que se construya feature_4;
// IniciarReclamoScreen se suma a este mismo Stack en ese momento.
export default function BuscarNavigator() {
  return (
    <Stack.Navigator initialRouteName="BuscadorInicial">
      <Stack.Screen
        name="BuscadorInicial"
        component={BuscadorInicialScreen}
        options={{ title: 'Buscar' }}
      />
      <Stack.Screen name="Resultados" component={ResultadosScreen} options={{ title: 'Resultados' }} />
      <Stack.Screen
        name="DetallePublicacion"
        component={DetallePublicacionScreen}
        options={{ title: 'Publicación' }}
      />
    </Stack.Navigator>
  );
}
