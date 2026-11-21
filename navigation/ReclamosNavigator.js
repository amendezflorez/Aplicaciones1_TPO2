import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MisReclamosScreen from '../screens/reclamos/MisReclamosScreen';
import PuntoEncuentroScreen from '../screens/reclamos/PuntoEncuentroScreen';
import ConfirmarDevolucionScreen from '../screens/reclamos/ConfirmarDevolucionScreen';
import MostrarQrScreen from '../screens/reclamos/MostrarQrScreen';
import { stackScreenOptions } from '../config/theme';
import { renderCampana } from './renderCampana';


const Stack = createNativeStackNavigator();

export default function ReclamosNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen name="MisReclamos" component={MisReclamosScreen} options={{ title: 'Mis reclamos', headerRight: renderCampana }} />
      <Stack.Screen name="PuntoEncuentro" component={PuntoEncuentroScreen} options={{ title: 'Devolución' }} />
      <Stack.Screen
        name="ConfirmarDevolucion"
        component={ConfirmarDevolucionScreen}
        options={{ title: 'Escanear QR' }}
      />
      <Stack.Screen name="MostrarQr" component={MostrarQrScreen} options={{ title: 'Código QR' }} />
    </Stack.Navigator>
  );
}