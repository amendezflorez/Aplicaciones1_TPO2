import { useState } from 'react';
import { View } from 'react-native';
import Button from '../../components/Button';
import Screen from '../../components/Screen';
import StepIndicator, { Requisito } from '../../components/StepIndicator';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { PASSWORD_MIN_LENGTH } from '../../config/constants';
import { spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { completeRegister } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidPassword } from '../../utils/validators';

// Registro, paso 3 de 3: contraseña. Al terminar queda con la sesión iniciada.
export default function SetPasswordScreen({ route }) {
  const { registrationToken } = route.params;
  const { login } = useAuth();
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const found = {};
    if (!isValidPassword(password)) {
      found.password = `Usá al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`;
    }
    if (password !== confirm) found.confirm = 'Las contraseñas no coinciden.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setError('');
    setLoading(true);
    try {
      const { token, user } = await completeRegister(registrationToken, password);
      await login(token, user);
      toast.success('¡Cuenta creada! Bienvenido a Hallado.');
    } catch (e) {
      setError(getErrorMessage(e, { 410: 'La verificación venció. Volvé a empezar el registro.' }));
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Elegí tu contraseña"
      subtitle="Último paso: con esto vas a ingresar a tu cuenta."
      footer={<Button title="Crear cuenta" icon="checkmark" onPress={handleSubmit} loading={loading} />}
    >
      <StepIndicator current={3} total={3} label="Contraseña" />
      <TextField
        label="Contraseña"
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        autoFocus
        error={errors.password}
      />
      <View style={{ gap: spacing.xs }}>
        <Requisito ok={password.length >= PASSWORD_MIN_LENGTH} text={`Al menos ${PASSWORD_MIN_LENGTH} caracteres`} />
        <Requisito ok={/[A-Za-z]/.test(password)} text="Una letra" />
        <Requisito ok={/[0-9]/.test(password)} text="Un número" />
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
