import Chip from './Chip';

// Estados de publicación (enum EstadoPublicacion del backend) y de reclamo (EstadoReclamo).
const ESTADOS = {
  abierta: { label: 'Abierta', tone: 'success', icon: 'ellipse' },
  en_reclamo: { label: 'En reclamo', tone: 'warning', icon: 'hourglass-outline' },
  resuelta: { label: 'Resuelta', tone: 'primary', icon: 'checkmark-circle' },
  vencida: { label: 'Vencida', tone: 'neutral', icon: 'time-outline' },
  pendiente: { label: 'Pendiente', tone: 'warning', icon: 'hourglass-outline' },
  pendiente_envio: { label: 'Pendiente de envío', tone: 'info', icon: 'cloud-upload-outline' },
  aceptado: { label: 'Aceptado', tone: 'success', icon: 'checkmark-circle' },
  rechazado: { label: 'Rechazado', tone: 'error', icon: 'close-circle' },
  vencido: { label: 'Vencido', tone: 'neutral', icon: 'time-outline' },
};

export default function EstadoChip({ estado, style }) {
  const info = ESTADOS[estado] ?? { label: estado ?? '—', tone: 'neutral' };
  return <Chip label={info.label} tone={info.tone} icon={info.icon} size="sm" style={style} />;
}
