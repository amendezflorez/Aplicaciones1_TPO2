import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../config/theme';
import { useNotificaciones } from '../hooks/useNotificaciones';

// Campana del header (Punto 12): abre la bandeja y muestra cuántas hay sin leer.
export default function HeaderBell() {
  const navigation = useNavigation();
  const { noLeidas } = useNotificaciones();
  const etiqueta = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : 'Notificaciones';
  return (
    <Pressable
      onPress={() => navigation.navigate('Notificaciones')}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={noLeidas > 0 ? 'notifications' : 'notifications-outline'} size={24} color={colors.text} />
      {noLeidas > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{noLeidas > 9 ? '9+' : noLeidas}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '800',
  },
});
