import { useState } from 'react';
import { Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import OtpInput from '../../components/OtpInput';
import Screen from '../../components/Screen';
import { OTP_LENGTH, RESEND_SECONDS } from '../../config/constants';
import { useCountdown } from '../../hooks/useCountdown';
import { resendOtp, verifyRegisterOtp } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';

export default function VerifyOtpScreen({ route, navigation }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  const handleVerify = async () => {
    if (code.length !== OTP_LENGTH) {
      setError(`El código tiene ${OTP_LENGTH} dígitos.`);
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const { registrationToken } = await verifyRegisterOtp(email, code);
      navigation.navigate('SetPassword', { registrationToken });
    } catch (e) {
      setError(getErrorMessage(e, { 400: 'El código es incorrecto.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await resendOtp(email, 'register');
      setCode('');
      setInfo('Te enviamos un nuevo código.');
      restart();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <Text>Ingresá el código que enviamos a {email}.</Text>
      <OtpInput value={code} onChangeText={setCode} />
      <ErrorText message={error} />
      {info ? <Text>{info}</Text> : null}
      <Button title="Confirmar" onPress={handleVerify} loading={loading} />
      <Button
        title={seconds > 0 ? `Reenviar código (${seconds}s)` : 'Reenviar código'}
        variant="secondary"
        onPress={handleResend}
        disabled={seconds > 0}
        loading={resending}
      />
    </Screen>
  );
}
