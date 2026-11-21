import { USE_MOCK } from '../config/env';
import { MODO_DEMO } from '../utils/demoMode';
import { InlineMessage } from './StateViews';

// Ayuda del código OTP, solo en modo demo (utils/demoMode.js). No se envía ningún email:
// con el backend real el código se imprime en su consola; con el servidor simulado es fijo.
export default function OtpDemoHint() {
  if (!MODO_DEMO) return null;
  const message = USE_MOCK
    ? 'Revisá tu email. Como esto es una demo, no se envía ningún mail real: con el servidor simulado el código es 123456.'
    : 'Revisá tu email. Como esto es una demo, no se envía ningún mail real: el código aparece en la consola del backend.';
  return <InlineMessage tone="info" message={message} />;
}
