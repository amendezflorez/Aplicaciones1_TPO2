import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import OtpDemoHint from '../../components/OtpDemoHint';
import OtpInput from '../../components/OtpInput';
import Screen from '../../components/Screen';
import StepIndicator from '../../components/StepIndicator';
import { InlineMessage } from '../../components/StateViews';
import { OTP_LENGTH, RESEND_SECONDS } from '../../config/constants';
import { colors, spacing, typography } from '../../config/theme';
import { useCountdown } from '../../hooks/useCountdown';
import { useToast } from '../../hooks/useToast';
import { resendOtp, verifyRegisterOtp } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';

// Registro, paso 2 de 3: código recibido por email.
export default function VerifyOtpScreen({ route, navigation }) {
  const { email } = route.params;
  const toast = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) {
      setError(`Completá los ${OTP_LENGTH} dígitos del código.`);
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { registrationToken } = await verifyRegisterOtp(email, code);
      navigation.navigate('SetPassword', { registrationToken });
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
      await resendOtp(email, 'register');
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
      title="Confirmá tu email"
      subtitle={`Ingresá el código de ${OTP_LENGTH} dígitos que enviamos a ${email}.`}
      footer={<Button title="Confirmar" iconRight="arrow-forward" onPress={handleVerify} loading={loading} />}
    >
      <StepIndicator current={2} total={3} label="Código" />
      <OtpInput value={code} onChangeText={setCode} error={!!error} autoFocus />
      <InlineMessage tone="error" message={error} />
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
      <Button title="Cambiar email" variant="ghost" onPress={() => navigation.goBack()} style={styles.link} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  resend: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  resendText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  link: {
    alignSelf: 'center',
  },
});
