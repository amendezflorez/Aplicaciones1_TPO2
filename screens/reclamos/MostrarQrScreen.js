import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import Button from '../../components/Button';
import Card from '../../components/Card';
import Screen from '../../components/Screen';
import { colors, radius, spacing, typography } from '../../config/theme';
import { serializarQrDevolucion } from '../../utils/qrDevolucion';

// Punto 11: quien devuelve el objeto muestra este QR y quien lo recupera lo escanea.
// El payload es un JSON serializado ({ tipo, v, publicacionId }, ver utils/qrDevolucion):
// ConfirmarDevolucionScreen lo parsea con JSON.parse y compara el publicacionId antes de
// llamar a POST /publicaciones/{id}/devolucion/confirmar.
// Alto contraste a propósito: negro sobre blanco, tamaño grande y zona de silencio amplia,
// para que se lea bien aunque la pantalla tenga poco brillo (expo-brightness no está instalado).
export default function MostrarQrScreen({ navigation, route }) {
  const { publicacionId, titulo } = route.params;
  const { width } = useWindowDimensions();
  const tamano = Math.min(width - spacing.md * 2 - spacing.lg * 2, 280);

  return (
    <Screen
      footer={<Button title="Listo" variant="secondary" onPress={() => navigation.goBack()} />}
    >
      <View style={styles.intro}>
        <Text style={typography.overline}>Entrega del objeto</Text>
        <Text style={typography.title} accessibilityRole="header">{titulo || 'Publicación'}</Text>
      </View>

      <Card style={styles.qrCard}>
        <View
          style={styles.qrFrame}
          accessible
          accessibilityLabel="Código QR de la publicación para confirmar la entrega"
        >
          <QRCode
            value={serializarQrDevolucion(publicacionId)}
            size={tamano}
            color="#000000"
            backgroundColor="#FFFFFF"
            quietZone={8}
            ecl="M"
          />
        </View>
      </Card>

      <View style={styles.tips}>
        <View style={styles.tipRow}>
          <Ionicons name="scan-outline" size={20} color={colors.primary} />
          <Text style={styles.tipText}>
            Mostrale este código a la otra persona para que lo escanee con su cámara desde la app.
          </Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="print-outline" size={20} color={colors.primary} />
          <Text style={styles.tipText}>También podés imprimirlo y pegarlo en el objeto.</Text>
        </View>
        <View style={styles.tipRow}>
          <Ionicons name="sunny-outline" size={20} color={colors.primary} />
          <Text style={styles.tipText}>Subí el brillo de la pantalla para que se lea mejor.</Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  qrCard: { alignItems: 'center', padding: spacing.lg, backgroundColor: colors.card },
  qrFrame: {
    padding: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tips: { gap: spacing.md - 4 },
  tipRow: { flexDirection: 'row', gap: spacing.md - 4, alignItems: 'flex-start' },
  tipText: { ...typography.body, color: colors.textSecondary, flex: 1 },
});
