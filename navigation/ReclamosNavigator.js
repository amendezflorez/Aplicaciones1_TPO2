import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MisReclamosScreen from '../screens/reclamos/MisReclamosScreen';
import PuntoEncuentroScreen from '../screens/reclamos/PuntoEncuentroScreen';
import ConfirmarDevolucionScreen from '../screens/reclamos/ConfirmarDevolucionScreen';

const Stack = createNativeStackNavigator();

export default function ReclamosNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MisReclamos" component={MisReclamosScreen} options={{ title: 'Mis reclamos' }} />
      <Stack.Screen name="PuntoEncuentro" component={PuntoEncuentroScreen} options={{ title: 'Devolución' }} />
      <Stack.Screen
        name="ConfirmarDevolucion"
        component={ConfirmarDevolucionScreen}
        options={{ title: 'Confirmar entrega' }}
      />
    </Stack.Navigator>
  );
}