import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import OtpDemoHint from '../../components/OtpDemoHint';
import OtpInput from '../../components/OtpInput';
import Screen from '../../components/Screen';
import StepIndicator, { Requisito } from '../../components/StepIndicator';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { OTP_LENGTH, PASSWORD_MIN_LENGTH, RESEND_SECONDS } from '../../config/constants';
import { colors, spacing, typography } from '../../config/theme';
import { useCountdown } from '../../hooks/useCountdown';
import { useToast } from '../../hooks/useToast';
import { resendOtp, resetPassword } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidPassword } from '../../utils/validators';

// Recupero de contraseña, paso 2 de 2: código + nueva contraseña.
export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const toast = useToast();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  const handleReset = async () => {
    const found = {};
    if (code.length !== OTP_LENGTH) found.code = `Completá los ${OTP_LENGTH} dígitos del código.`;
    if (!isValidPassword(password)) {
      found.password = `Usá al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`;
    }
    if (password !== confirm) found.confirm = 'Las contraseñas no coinciden.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setError('');
    setLoading(true);
    try {
      await resetPassword(email, code, password);
      toast.success('Contraseña actualizada. Ya podés ingresar.');
      navigation.popToTop();
    } catch (e) {
      setError(getErrorMessage(e, { 400: 'El código es incorrecto. Revisalo e intentá de nuevo.', 410: 'El código venció. Pedí uno nuevo.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      await resendOtp(email, 'reset');
      setCode('');
      toast.success('Te enviamos un código nuevo.');
      restart();
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen
      title="Nueva contraseña"
      subtitle={`Ingresá el código que enviamos a ${email} y elegí tu nueva contraseña.`}
      footer={<Button title="Cambiar contraseña" icon="checkmark" onPress={handleReset} loading={loading} />}
    >
      <StepIndicator current={2} total={2} label="Código y contraseña" />
      <OtpInput value={code} onChangeText={setCode} error={!!errors.code || !!error} autoFocus />
      {errors.code ? <Text style={styles.codeError}>{errors.code}</Text> : null}
      <OtpDemoHint />
      <View style={styles.resend}>
        <Text style={styles.resendText}>
          {seconds > 0 ? `Podés pedir un código nuevo en ${seconds} s` : '¿No te llegó el código?'}
        </Text>
        <Button
          title="Reenviar código"
          variant="secondary"
          size="sm"
          icon="refresh"
          onPress={handleResend}
          disabled={seconds > 0}
          loading={resending}
        />
      </View>

      <TextField
        label="Nueva contraseña"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        error={errors.password}
      />
      <View style={{ gap: spacing.xs }}>
        <Requisito ok={password.length >= PASSWORD_MIN_LENGTH} text={`Al menos ${PASSWORD_MIN_LENGTH} caracteres`} />
        <Requisito ok={/[A-Za-z]/.test(password) && /[0-9]/.test(password)} text="Con letras y números" />
      </View>
      <TextField
        label="Repetir contraseña"
        icon="lock-closed-outline"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
        error={errors.confirm}
      />
      <InlineMessage tone="error" message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeError: {
    fontSize: 13,
    color: colors.error,
  },
  resend: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  resendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
