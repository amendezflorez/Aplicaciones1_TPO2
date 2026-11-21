import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AvisosCola from './components/AvisosCola';
import { colors } from './config/theme';
import { AuthProvider } from './context/AuthContext';
import { ConnectivityProvider } from './context/ConnectivityContext';
import { NotificacionesProvider } from './context/NotificacionesContext';
import { ReclamosProvider } from './context/ReclamosContext';
import { SearchProvider } from './context/SearchContext';
import { ToastProvider } from './context/ToastContext';
import { navigationRef } from './navigation/navigationRef';
import RootNavigator from './navigation/RootNavigator';

// Tema de React Navigation alineado con config/theme.js (fondo de pantallas, tarjetas,
// bordes y color primario de los headers/tabs).
const navTheme = {
  dark: false,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' },
    medium: { fontFamily: 'System', fontWeight: '500' },
    bold: { fontFamily: 'System', fontWeight: '700' },
    heavy: { fontFamily: 'System', fontWeight: '800' },
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      {/* ToastProvider afuera de todo: cualquier pantalla o contexto puede dar feedback. */}
      <ToastProvider>
        {/* Más afuera que AuthProvider (Punto 6): AuthProvider usa useConnectivity() para
           inyectar notificarErrorDeRed/notificarExitoDeRed en el interceptor de Axios. */}
        <ConnectivityProvider>
          <AuthProvider>
            <NotificacionesProvider>
              <SearchProvider>
                <ReclamosProvider>
                  <NavigationContainer ref={navigationRef} theme={navTheme}>
                    {/* Toast global cuando la cola offline envía una publicación pendiente. */}
                    <AvisosCola />
                    <RootNavigator />
                    <StatusBar style="dark" />
                  </NavigationContainer>
                </ReclamosProvider>
              </SearchProvider>
            </NotificacionesProvider>
          </AuthProvider>
        </ConnectivityProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
