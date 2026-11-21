import { Ionicons } from '@expo/vector-icons';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';
import Button from './Button';

// Punto 11 (consigna): si la persona no dio permiso de cámara (o ubicación), la app
// 1) explica para qué lo necesita, 2) ofrece una alternativa cuando existe (p. ej. elegir
// de la galería) y 3) permite abrir la configuración del dispositivo para habilitarlo.
// Usar en todas las pantallas que piden cámara: publicar, reclamo, perfil, escanear QR.
export default function PermisoDenegado({
  icon = 'camera-outline',
  titulo = 'Necesitamos acceso a la cámara',
  motivo,
  puedePreguntar = false,
  onPedirPermiso,
  alternativaLabel,
  onAlternativa,
  style,
}) {
  return (
    <View style={[styles.box, style]} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={28} color={colors.warning} />
      </View>
      <Text style={styles.titulo}>{titulo}</Text>
      {motivo ? <Text style={styles.motivo}>{motivo}</Text> : null}
      <View style={styles.acciones}>
        {puedePreguntar && onPedirPermiso ? (
          <Button title="Dar permiso" icon="checkmark" onPress={onPedirPermiso} />
        ) : (
          <Button title="Abrir configuración" icon="settings-outline" onPress={() => Linking.openSettings()} />
        )}
        {alternativaLabel && onAlternativa ? (
          <Button title={alternativaLabel} icon="images-outline" variant="secondary" onPress={onAlternativa} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.warningSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    ...typography.subheading,
    textAlign: 'center',
  },
  motivo: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  acciones: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
