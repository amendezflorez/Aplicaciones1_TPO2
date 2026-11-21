import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Button from '../../components/Button';
import Screen from '../../components/Screen';
import StepIndicator from '../../components/StepIndicator';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { colors, spacing, typography } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { requestRegisterOtp } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidEmail } from '../../utils/validators';

// Registro, paso 1 de 3: email -> (2) código -> (3) contraseña.
export default function RegisterEmailScreen({ navigation }) {
  const { sinConexion } = useConnectivity();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');

  const handleContinue = async () => {
    if (!isValidEmail(email)) {
      setFieldError('Ingresá un email válido, por ejemplo nombre@correo.com.');
      return;
    }
    setFieldError('');
    setError('');
    setLoading(true);
    try {
      const cleanEmail = email.trim();
      await requestRegisterOtp(cleanEmail);
      navigation.navigate('VerifyOtp', { email: cleanEmail });
    } catch (e) {
      setError(getErrorMessage(e, { 409: 'Ya existe una cuenta con ese email. Probá ingresar.' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Creá tu cuenta"
      subtitle="Empezá con tu email. Te vamos a mandar un código para confirmar que es tuyo."
      footer={
        <>
          {sinConexion ? <Text style={styles.offline}>Necesitás conexión para continuar.</Text> : null}
          <Button title="Enviar código" iconRight="arrow-forward" onPress={handleContinue} loading={loading} disabled={sinConexion} />
        </>
      }
    >
      <StepIndicator current={1} total={3} label="Tu email" />
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
        onSubmitEditing={handleContinue}
        error={fieldError}
      />
      <InlineMessage tone="error" message={error} />
      <Button
        title="Ya tengo cuenta"
        variant="ghost"
        onPress={() => navigation.navigate('Login')}
        style={styles.link}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  link: {
    alignSelf: 'center',
  },
  offline: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
});
