import { createNativeStackNavigator } from '@react-navigation/native-stack';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PublicProfileScreen from '../screens/profile/PublicProfileScreen';
import SettingsScreen from '../screens/profile/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function ProfileNavigator() {
  return (
    <Stack.Navigator initialRouteName="Profile">
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'Mi perfil' }} />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Editar perfil' }}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configuración' }} />
      <Stack.Screen
        name="PublicProfile"
        component={PublicProfileScreen}
        options={{ title: 'Perfil público' }}
      />
    </Stack.Navigator>
  );
}
