import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AlertasSeguidasScreen from '../screens/alertas/AlertasSeguidasScreen';
import { stackScreenOptions } from '../config/theme';
import { renderCampana } from './renderCampana';


const Stack = createNativeStackNavigator();

export default function AlertasNavigator() {
  return (
    <Stack.Navigator screenOptions={stackScreenOptions}>
      <Stack.Screen
        name="AlertasSeguidas"
        component={AlertasSeguidasScreen}
        options={{ title: 'Alertas y Seguidas', headerBackVisible: false, headerRight: renderCampana }}
      />
    </Stack.Navigator>
  );
}
