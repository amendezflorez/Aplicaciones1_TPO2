import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { escucharColaProcesada, registrarAvisosGlobales } from '../services/offline/colaProcesador';

// Punto 6: avisa con un toast cuando la cola offline envía sola una publicación pendiente
// (o cuando el servidor la rechaza). No renderiza nada: montarlo UNA vez, dentro de
// AuthProvider y ToastProvider, en el árbol autenticado (ver reporte: AppNavigator).
export default function AvisosCola() {
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => registrarAvisosGlobales(), []);

  useEffect(() => {
    if (!user) return undefined;
    return escucharColaProcesada((userId, evento) => {
      if (userId !== user.id || !evento) return;
      if (evento.tipo === 'enviada') {
        toast.success(`¡Publicada! "${evento.titulo || 'Tu publicación'}" ya aparece en las búsquedas.`);
      } else if (evento.tipo === 'error') {
        toast.error(`No pudimos publicar "${evento.titulo || 'tu publicación'}". Revisala en Mis publicaciones.`);
      }
    });
  }, [user, toast]);

  return null;
}
