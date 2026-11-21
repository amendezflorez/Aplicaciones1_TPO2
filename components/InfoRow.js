import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../config/theme';

// Fila ícono + etiqueta + valor (detalle de publicación, reclamos, perfil).
export default function InfoRow({ icon, label, value, children, style }) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.texts}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {value != null && value !== '' ? <Text style={styles.value}>{value}</Text> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md - 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 1,
    paddingTop: 1,
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.bodyStrong,
  },
});
