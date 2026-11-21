import { createNavigationContainerRef } from '@react-navigation/native';

// Ref global del NavigationContainer: permite navegar desde fuera de una pantalla (al
// tocar una notificación push, Punto 12).
export const navigationRef = createNavigationContainerRef();

// Pantalla que abre cada tipo de notificación. Los reclamos recibidos y los que cambiaron
// de estado van a "Mis reclamos" (con el segmento que corresponde); todo lo del punto de
// encuentro va a la pantalla de devolución de ese reclamo.
export function destinoDeNotificacion(data) {
  const tipo = data?.tipo;
  const reclamoId = data?.reclamoId;
  switch (tipo) {
    case 'reclamo_recibido':
      return ['Reclamos', { screen: 'MisReclamos', params: { segmento: 'recibidos', reclamoId } }];
    case 'reclamo_aceptado':
    case 'encuentro_propuesto':
    case 'encuentro_modificado':
    case 'encuentro_aceptado':
      return reclamoId
        ? ['Reclamos', { screen: 'PuntoEncuentro', params: { reclamoId } }]
        : ['Reclamos', { screen: 'MisReclamos' }];
    case 'reclamo_rechazado':
    case 'reclamo_vencido':
      return ['Reclamos', { screen: 'MisReclamos', params: { segmento: 'enviados', reclamoId } }];
    case 'devolucion_confirmada':
      return ['Perfil', { screen: 'Historial' }];
    default:
      return ['Notificaciones'];
  }
}

// Las tabs viven dentro de la ruta "Tabs" del stack raíz (RootNavigator), así que desde
// el ref se navega con la ruta completa: Tabs > <tab> > <pantalla>.
export function navegarADestino(data) {
  if (!navigationRef.isReady()) return false;
  const [ruta, params] = destinoDeNotificacion(data);
  if (ruta === 'Notificaciones') navigationRef.navigate('Notificaciones');
  else navigationRef.navigate('Tabs', { screen: ruta, params });
  return true;
}
