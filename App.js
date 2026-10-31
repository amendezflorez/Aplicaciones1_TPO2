import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './context/AuthContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { ReclamosProvider } from './context/ReclamosContext';
import { SearchProvider } from './context/SearchContext';
import RootNavigator from './navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      {/* Más afuera que AuthProvider (Punto 6): AuthProvider necesita useConnectivity()
         para inyectar notificarErrorDeRed en el interceptor de Axios — ver AuthContext.js. */}
      <ConnectivityProvider>
        <AuthProvider>
          <SearchProvider>
            <ReclamosProvider>
              <NavigationContainer>
                <RootNavigator />
                <StatusBar style="auto" />
              </NavigationContainer>
            </ReclamosProvider>
          </SearchProvider>
        </AuthProvider>
      </ConnectivityProvider>
    </SafeAreaProvider>
  );
}
