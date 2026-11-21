import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterEmailScreen from '../screens/auth/RegisterEmailScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import SetPasswordScreen from '../screens/auth/SetPasswordScreen';
import VerifyOtpScreen from '../screens/auth/VerifyOtpScreen';
import { stackScreenOptions } from '../config/theme';

const Stack = createNativeStackNavigator();

// Las pantallas del flujo tienen su propio título grande e indicador de paso, así que el
// header solo aporta la flecha de volver (title vacío). El login no lleva header: tiene la marca.
export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ ...stackScreenOptions, title: '' }} initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="RegisterEmail" component={RegisterEmailScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="SetPassword" component={SetPasswordScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
