import { Ionicons } from '@expo/vector-icons';
import { Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';
import { useToast } from '../hooks/useToast';
import { formatCoordenadas } from '../utils/publicacionFormatters';
import Button from './Button';

// Destino para los mapas: "lat,lng" si el punto tiene coordenadas; si no, la dirección.
function destinoDe(ubicacion) {
  if (ubicacion.latitud != null && ubicacion.longitud != null) {
    return `${ubicacion.latitud},${ubicacion.longitud}`;
  }
  return ubicacion.direccion || '';
}

// URLs a probar, en orden. Punto 8 de la consigna: abrir Google Maps (o la app de mapas por
// defecto) con el destino precargado en MODO NAVEGACIÓN.
// - Android: google.navigation: arranca la navegación directo; si no hay Google Maps, el
//   link web (que Android deriva a la app si existe) y por último geo: (cualquier app de mapas).
// - iOS / web: link web de Google Maps con dir_action=navigate; Apple Maps como alternativa.
function urlsDeNavegacion(destino) {
  const q = encodeURIComponent(destino);
  const web = `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving&dir_action=navigate`;
  if (Platform.OS === 'android') {
    return [`google.navigation:q=${q}`, web, `geo:0,0?q=${q}`];
  }
  return [web, `http://maps.apple.com/?daddr=${q}&dirflg=d`];
}

// Tarjeta de un punto de encuentro (propuesto o acordado) con el botón "Cómo llegar".
// children: contenido extra debajo de la dirección (acciones, contacto).
export default function PuntoEncuentroCard({
  ubicacion,
  titulo = 'Punto propuesto',
  destacado = false,
  mostrarComoLlegar = true,
  children,
}) {
  const toast = useToast();

  const comoLlegar = async () => {
    const destino = destinoDe(ubicacion);
    if (!destino) {
      toast.error('Este punto no tiene una dirección para navegar.');
      return;
    }
    for (const url of urlsDeNavegacion(destino)) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Esquema no soportado en este dispositivo: se prueba el siguiente.
      }
    }
    toast.error('No pudimos abrir la app de mapas. Instalá Google Maps o copiá la dirección.');
  };

  const coordenadas = formatCoordenadas(ubicacion.latitud, ubicacion.longitud);

  return (
    <View style={[styles.container, destacado && styles.destacado]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, destacado && styles.iconBoxDestacado]}>
          <Ionicons name="location" size={22} color={destacado ? colors.white : colors.primary} />
        </View>
        <View style={styles.texts}>
          <Text style={typography.overline}>{titulo}</Text>
          <Text style={styles.address}>{ubicacion.direccion}</Text>
          {ubicacion.referencia ? <Text style={styles.reference}>{ubicacion.referencia}</Text> : null}
          {coordenadas ? <Text style={typography.mono}>{coordenadas}</Text> : null}
        </View>
      </View>
      {mostrarComoLlegar ? (
        <Button
          title="Cómo llegar"
          icon="navigate"
          variant={destacado ? 'primary' : 'secondary'}
          onPress={comoLlegar}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    gap: spacing.md,
  },
  destacado: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  header: { flexDirection: 'row', gap: spacing.md - 4 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxDestacado: { backgroundColor: colors.primary },
  texts: { flex: 1, gap: spacing.xxs },
  address: { ...typography.subheading },
  reference: { ...typography.body, color: colors.textSecondary },
});
