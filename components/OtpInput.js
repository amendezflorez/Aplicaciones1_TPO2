import { StyleSheet, TextInput } from 'react-native';
import { OTP_LENGTH } from '../config/constants';
import { colors, radius, spacing } from '../config/theme';

export default function OtpInput({ value, onChangeText }) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={(text) => onChangeText(text.replace(/[^0-9]/g, ''))}
      keyboardType="number-pad"
      maxLength={OTP_LENGTH}
      placeholder="000000"
      placeholderTextColor={colors.border}
      textContentType="oneTimeCode"
      autoComplete="one-time-code"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    color: colors.text,
  },
});
