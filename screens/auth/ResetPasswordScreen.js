import { useState } from 'react';
import { Alert, Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import OtpInput from '../../components/OtpInput';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { OTP_LENGTH, PASSWORD_MIN_LENGTH, RESEND_SECONDS } from '../../config/constants';
import { useCountdown } from '../../hooks/useCountdown';
import { resendOtp, resetPassword } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidPassword } from '../../utils/validators';

export default function ResetPasswordScreen({ route, navigation }) {
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const { seconds, restart } = useCountdown(RESEND_SECONDS);

  const handleReset = async () => {
    if (code.length !== OTP_LENGTH) {
      setError(`El código tiene ${OTP_LENGTH} dígitos.`);
      return;
    }
    if (!isValidPassword(password)) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await resetPassword(email, code, password);
      Alert.alert('Contraseña actualizada', 'Ya podés ingresar con tu nueva contraseña.');
      navigation.popToTop();
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
      await resendOtp(email, 'reset');
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
      <Text>Ingresá el código que enviamos a {email} y tu nueva contraseña.</Text>
      <OtpInput value={code} onChangeText={setCode} />
      <TextField
        label="Nueva contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
      />
      <TextField
        label="Repetir contraseña"
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoComplete="new-password"
      />
      <ErrorText message={error} />
      {info ? <Text>{info}</Text> : null}
      <Button title="Cambiar contraseña" onPress={handleReset} loading={loading} />
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
