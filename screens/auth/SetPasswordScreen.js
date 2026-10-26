import { useState } from 'react';
import { Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { PASSWORD_MIN_LENGTH } from '../../config/constants';
import { useAuth } from '../../hooks/useAuth';
import { completeRegister } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidPassword } from '../../utils/validators';

export default function SetPasswordScreen({ route }) {
  const { registrationToken } = route.params;
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!isValidPassword(password)) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`);
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { token, user } = await completeRegister(registrationToken, password);
      await login(token, user);
    } catch (e) {
      setError(getErrorMessage(e, { 410: 'La verificación expiró. Volvé a empezar el registro.' }));
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text>Definí tu contraseña para terminar el registro.</Text>
      <TextField
        label="Contraseña"
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
      <Button title="Crear cuenta" onPress={handleSubmit} loading={loading} />
    </Screen>
  );
}
