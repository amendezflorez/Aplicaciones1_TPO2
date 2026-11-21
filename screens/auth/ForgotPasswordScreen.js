import { useState } from 'react';
import Button from '../../components/Button';
import Screen from '../../components/Screen';
import StepIndicator from '../../components/StepIndicator';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { forgotPassword } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidEmail } from '../../utils/validators';

// Recupero de contraseña, paso 1 de 2: pedir el código por email.
export default function ForgotPasswordScreen({ navigation }) {
  const { sinConexion } = useConnectivity();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');

  const handleSend = async () => {
    if (!isValidEmail(email)) {
      setFieldError('Ingresá un email válido, por ejemplo nombre@correo.com.');
      return;
    }
    setFieldError('');
    setError('');
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      await forgotPassword(cleanEmail);
      toast.success('Si el email está registrado, te enviamos un código.');
      navigation.navigate('ResetPassword', { email: cleanEmail });
    } catch (e) {
      setError(getErrorMessage(e, { 429: 'Ya te enviamos un código hace instantes. Esperá un minuto para pedir otro.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Recuperá tu contraseña"
      subtitle="Ingresá tu email y te enviamos un código para definir una nueva contraseña."
      footer={
        <Button
          title="Enviar código"
          iconRight="arrow-forward"
          onPress={handleSend}
          loading={loading}
          disabled={sinConexion}
        />
      }
    >
      <StepIndicator current={1} total={2} label="Tu email" />
      <TextField
        label="Email"
        icon="mail-outline"
        placeholder="tu@email.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        autoFocus
        returnKeyType="send"
        onSubmitEditing={handleSend}
        error={fieldError}
      />
      <InlineMessage tone="error" message={error} />
      {sinConexion ? <InlineMessage tone="warning" message="Necesitás conexión para pedir el código." /> : null}
    </Screen>
  );
}
