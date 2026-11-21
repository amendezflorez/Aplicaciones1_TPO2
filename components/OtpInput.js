import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { OTP_LENGTH } from '../config/constants';
import { colors, radius, spacing } from '../config/theme';

// Código de verificación en cajas separadas. Un único TextInput invisible recibe lo que se
// escribe o pega (también el autocompletado del SMS/email) y cada caja muestra un dígito.
// Tocar cualquier caja enfoca el input. error pinta las cajas en rojo.
export default function OtpInput({ value, onChangeText, error = false, autoFocus = false }) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      style={styles.row}
    >
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const active = focused && i === activeIndex;
        return (
          <View
            key={i}
            style={[
              styles.box,
              value[i] && styles.boxFilled,
              active && styles.boxActive,
              error && styles.boxError,
            ]}
          >
            <Text style={styles.digit}>{value[i] ?? ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        maxLength={OTP_LENGTH}
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`Código de ${OTP_LENGTH} dígitos`}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  box: {
    flex: 1,
    height: 58,
    maxWidth: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: colors.borderStrong,
  },
  boxActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  boxError: {
    borderColor: colors.error,
  },
  digit: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  // Cubre todas las cajas con opacidad 0: el foco y el pegado funcionan sobre cualquiera.
  hidden: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.01,
    color: 'transparent',
  },
});
