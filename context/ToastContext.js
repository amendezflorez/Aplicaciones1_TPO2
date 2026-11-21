import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../config/theme';

// Feedback de acciones (devolución del docente: "falta brindar feedback al usuario después
// de realizar una acción"). Toda acción que cambia datos muestra un toast al terminar:
//   const toast = useToast();
//   toast.success('Perfil actualizado');
//   toast.error(getErrorMessage(e));
// Un solo toast visible a la vez; el nuevo reemplaza al anterior.

export const ToastContext = createContext(null);

const TIPOS = {
  success: { bg: colors.text, icon: 'checkmark-circle', iconColor: '#6EE7A8' },
  error: { bg: colors.error, icon: 'alert-circle', iconColor: colors.white },
  info: { bg: colors.text, icon: 'information-circle', iconColor: '#93C5FD' },
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [anim] = useState(() => new Animated.Value(0));
  const timer = useRef(null);
  const insets = useSafeAreaInsets();

  const ocultar = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setToast(null));
  }, [anim]);

  const show = useCallback(
    (tipo, mensaje, duracion) => {
      if (!mensaje) return;
      clearTimeout(timer.current);
      setToast({ tipo, mensaje, id: Date.now() });
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 8 }).start();
      timer.current = setTimeout(ocultar, duracion ?? (tipo === 'error' ? 4500 : 2800));
    },
    [anim, ocultar]
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  const value = useMemo(
    () => ({
      success: (m, d) => show('success', m, d),
      error: (m, d) => show('error', m, d),
      info: (m, d) => show('info', m, d),
    }),
    [show]
  );

  const t = toast ? TIPOS[toast.tipo] : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={[
            styles.host,
            { bottom: insets.bottom + 72 },
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            },
          ]}
        >
          <Pressable
            onPress={ocultar}
            style={[styles.toast, { backgroundColor: t.bg }, shadow.lg]}
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
            <Ionicons name={t.icon} size={22} color={t.iconColor} />
            <Text style={styles.text}>{toast.mensaje}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    maxWidth: 520,
    width: '100%',
  },
  text: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
});
