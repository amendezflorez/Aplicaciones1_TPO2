import { Alert, Platform } from 'react-native';
import { registerRootComponent } from 'expo';

import App from './App';

// Solo en web (vista previa/pruebas): Alert.alert de react-native-web no hace nada, así que
// las confirmaciones (aceptar/rechazar reclamo, cerrar sesión...) no se podían ni usar ni
// probar. En Android/iOS se usa el Alert nativo, sin cambios.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  Alert.alert = (titulo, mensaje, botones) => {
    const acciones = botones && botones.length ? botones : [{ text: 'OK' }];
    const confirmar = acciones.find((b) => b.style !== 'cancel') ?? acciones[0];
    const aceptado = acciones.length === 1 || window.confirm([titulo, mensaje].filter(Boolean).join('\n\n'));
    if (aceptado) confirmar.onPress?.();
    else acciones.find((b) => b.style === 'cancel')?.onPress?.();
  };
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
