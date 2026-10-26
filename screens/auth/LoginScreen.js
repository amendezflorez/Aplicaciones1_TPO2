import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { colors } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { loginRequest } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidEmail } from '../../utils/validators';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!isValidEmail(email) || !password) {
      setError('Ingresá un email válido y tu contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { token, user } = await loginRequest(email.trim(), password);
      await login(token, user);
    } catch (e) {
      setError(getErrorMessage(e, { 401: 'Email o contraseña incorrectos.' }));
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Hallado</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
      />
      <ErrorText message={error} />
      <Button title="Ingresar" onPress={handleLogin} loading={loading} />
      <Button
        title="Olvidé mi contraseña"
        variant="secondary"
        onPress={() => navigation.navigate('ForgotPassword')}
      />
      <Button
        title="Crear cuenta"
        variant="secondary"
        onPress={() => navigation.navigate('RegisterEmail')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primaryDark,
    textAlign: 'center',
    marginVertical: 24,
  },
});
