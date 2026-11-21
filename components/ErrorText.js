import { InlineMessage } from './StateViews';

// Compatibilidad: las pantallas viejas usan <ErrorText message=... />. Ahora es un aviso
// visible (fondo + ícono), no texto rojo suelto.
export default function ErrorText({ message, style }) {
  return <InlineMessage tone="error" message={message} style={style} />;
}
