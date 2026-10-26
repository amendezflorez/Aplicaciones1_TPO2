import { useState } from 'react';
import { Text } from 'react-native';
import Button from '../../components/Button';
import ErrorText from '../../components/ErrorText';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { requestRegisterOtp } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidEmail } from '../../utils/validators';

export default function RegisterEmailScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!isValidEmail(email)) {
      setError('Ingresá un email válido.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      await requestRegisterOtp(cleanEmail);
      navigation.navigate('VerifyOtp', { email: cleanEmail });
    } catch (e) {
      setError(getErrorMessage(e, { 409: 'Ya existe una cuenta con ese email.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text>Te enviaremos un código de validación a tu email.</Text>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
      />
      <ErrorText message={error} />
      <Button title="Enviar código" onPress={handleContinue} loading={loading} />
    </Screen>
  );
}
