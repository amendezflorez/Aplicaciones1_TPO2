import { Linking, StyleSheet, Text, Alert, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';
import Button from './Button';

export default function PuntoEncuentroCard({ ubicacion, titulo = 'Punto propuesto' }) {
  const abrirMapas = async () => {
    const destino = ubicacion.latitud != null && ubicacion.longitud != null
      ? `${ubicacion.latitud},${ubicacion.longitud}`
      : ubicacion.direccion;
    const destinoCodificado = encodeURIComponent(destino);
    const urls = [
      `geo:0,0?q=${destinoCodificado}`,
      `google.navigation:q=${destinoCodificado}&mode=w`,
      `https://www.google.com/maps/dir/?api=1&destination=${destinoCodificado}&travelmode=walking&dir_action=navigate`,
    ];

    for (const url of urls) {
      try {
        await Linking.openURL(url);
        return;
      } catch {
        // Prueba el siguiente esquema; el último abre Google Maps en el navegador.
      }
    }

    Alert.alert('No se pudo abrir Mapas', 'Revisá que haya una aplicación de mapas disponible.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{titulo}</Text>
      <Text style={styles.address}>{ubicacion.direccion}</Text>
      {ubicacion.referencia ? <Text style={styles.reference}>{ubicacion.referencia}</Text> : null}
      <Button title="Cómo llegar" onPress={abrirMapas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: spacing.sm,
  },
  eyebrow: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  address: { color: colors.text, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  reference: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
});