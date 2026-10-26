import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterEmailScreen from '../screens/auth/RegisterEmailScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'Ingresar' }} />
      <Stack.Screen
        name="RegisterEmail"
        component={RegisterEmailScreen}
        options={{ title: 'Crear cuenta' }}
      />
      <Stack.Screen
        name="VerifyOtp"
        component={VerifyOtpScreen}
        options={{ title: 'Validar email' }}
      />
      <Stack.Screen
        name="SetPassword"
        component={SetPasswordScreen}
        options={{ title: 'Definir contraseña' }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Recuperar contraseña' }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ title: 'Nueva contraseña' }}
      />
    </Stack.Navigator>
  );
}
