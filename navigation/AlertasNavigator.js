import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AlertasSeguidasScreen from '../screens/alertas/AlertasSeguidasScreen';

const Stack = createNativeStackNavigator();

export default function AlertasNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AlertasSeguidas"
        component={AlertasSeguidasScreen}
        options={{ title: 'Alertas y Seguidas', headerBackVisible: false }}
      />
    </Stack.Navigator>
  );
}
