import { useState } from 'react';
import { Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { forgotPassword } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidEmail } from '../../utils/validators';

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!isValidEmail(email)) {
      setError('Ingresá un email válido.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      await forgotPassword(cleanEmail);
      navigation.navigate('ResetPassword', { email: cleanEmail });
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text>Ingresá tu email y te enviaremos un código para definir una nueva contraseña.</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <ErrorText message={error} />
      <Button title="Enviar código" onPress={handleSend} loading={loading} />
    </Screen>
  );
}
