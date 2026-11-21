import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Button from '../../components/Button';
import HalladoLogo from '../../components/HalladoLogo';
import Screen from '../../components/Screen';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { colors, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { loginRequest } from '../../services/authService';
import { getErrorMessage } from '../../services/errors';
import { isValidEmail } from '../../utils/validators';

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const { sinConexion } = useConnectivity();
  const passwordRef = useRef(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const found = {};
    if (!isValidEmail(email)) found.email = 'Ingresá un email válido.';
    if (!password) found.password = 'Ingresá tu contraseña.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
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
    <Screen safeTop style={styles.content}>
      <View style={styles.brand}>
        <HalladoLogo size={84} withWordmark />
        <Text style={styles.tagline}>Encontrá lo que perdiste.{'\n'}Devolvé lo que encontraste.</Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Email"
          icon="mail-outline"
          placeholder="tu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          error={errors.email}
        />
        <TextField
          ref={passwordRef}
          label="Contraseña"
          icon="lock-closed-outline"
          placeholder="Tu contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
          returnKeyType="go"
          onSubmitEditing={handleLogin}
          error={errors.password}
        />
        <Button
          title="¿Olvidaste tu contraseña?"
          variant="ghost"
          size="sm"
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgot}
        />
        <InlineMessage tone="error" message={error} />
        {sinConexion ? (
          <InlineMessage tone="warning" message="Sin conexión: necesitás internet para ingresar." />
        ) : null}
        <Button title="Ingresar" onPress={handleLogin} loading={loading} disabled={sinConexion} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Todavía no tenés cuenta?</Text>
        <Button title="Crear cuenta" variant="secondary" onPress={() => navigation.navigate('RegisterEmail')} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  brand: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  forgot: {
    alignSelf: 'flex-end',
    minHeight: 44,
    marginTop: -spacing.sm,
  },
  footer: {
    gap: spacing.sm,
    alignItems: 'stretch',
    marginTop: spacing.sm,
  },
  footerText: {
    ...typography.caption,
    textAlign: 'center',
  },
});
