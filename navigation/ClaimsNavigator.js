import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ClaimDetailScreen from '../screens/claims/ClaimDetailScreen';
import ClaimsHomeScreen from '../screens/claims/ClaimsHomeScreen';
import EncounterScreen from '../screens/claims/EncounterScreen';
import MyClaimsScreen from '../screens/claims/MyClaimsScreen';
import NewClaimScreen from '../screens/claims/NewClaimScreen';

const Stack = createNativeStackNavigator();

export default function ClaimsNavigator() {
  return (
    <Stack.Navigator initialRouteName="ClaimsHome">
      <Stack.Screen name="ClaimsHome" component={ClaimsHomeScreen} options={{ title: 'Reclamos' }} />
      <Stack.Screen name="NewClaim" component={NewClaimScreen} options={{ title: 'Nuevo reclamo' }} />
      <Stack.Screen name="MyClaims" component={MyClaimsScreen} options={{ title: 'Mis reclamos' }} />
      <Stack.Screen name="ClaimDetail" component={ClaimDetailScreen} options={{ title: 'Detalle del reclamo' }} />
      <Stack.Screen name="Encounter" component={EncounterScreen} options={{ title: 'Punto de encuentro' }} />
    </Stack.Navigator>
  );
}
