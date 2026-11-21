import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';
import { formatFecha, formatFechaHora } from '../utils/publicacionFormatters';
import { resolverUrlFoto } from '../utils/fotoUrl';
import { rolesReclamo, textoVencimiento } from '../utils/reclamoRoles';
import Avatar from './Avatar';
import Button from './Button';
import Card from './Card';
import Chip from './Chip';
import EstadoChip from './EstadoChip';
import FotoPublicacion from './FotoPublicacion';

// Tarjeta de un reclamo en "Mis reclamos" (Punto 7). Muestra la publicación, quién reclama,
// el tipo ("Es mío" / "Lo encontré"), las pruebas adjuntas y las acciones que correspondan
// al estado: aceptar/rechazar (publicador), coordinar devolución y QR (reclamo aceptado).
export default function ReclamoCard({
  reclamo,
  userId,
  onDecision,
  onOpenPublicacion,
  onOpenEncuentro,
  onConfirmarEntrega,
  onMostrarQr,
  accionEnCurso,
  sinConexion,
}) {
  const { recibido, soyTitular, otro } = rolesReclamo(reclamo, userId);
  const esMio = reclamo.tipo === 'es_mio';
  const vence = reclamo.estado === 'pendiente' ? textoVencimiento(reclamo.venceEn) : null;
  const entregaConfirmada = reclamo.estado === 'aceptado' && reclamo.publicacionEstado === 'resuelta';
  const enCurso = Boolean(accionEnCurso);
  const barrio = reclamo.barrioEncontrado?.name;

  return (
    <Card style={styles.card}>
      <Pressable
        onPress={() => onOpenPublicacion(reclamo)}
        accessibilityRole="button"
        accessibilityLabel={`Ver la publicación ${reclamo.publicacionTitulo}`}
        style={({ pressed }) => [styles.heading, pressed && styles.pressed]}
      >
        <FotoPublicacion url={reclamo.publicacionFotoUrl} style={styles.thumb} />
        <View style={styles.titleColumn}>
          <View style={styles.chipsRow}>
            <Chip
              label={esMio ? 'Es mío' : 'Lo encontré'}
              icon={esMio ? 'hand-left-outline' : 'search-outline'}
              tone={esMio ? 'accent' : 'primary'}
              size="sm"
            />
            <EstadoChip estado={reclamo.estado} />
          </View>
          <Text style={styles.title} numberOfLines={2}>{reclamo.publicacionTitulo}</Text>
          <Text style={typography.caption}>Enviado el {formatFecha(reclamo.creadaEn)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Pressable>

      <View style={styles.person}>
        <Avatar uri={otro.fotoUrl} name={otro.nombre || ''} size={32} />
        <Text style={styles.personName} numberOfLines={1}>
          <Text style={typography.caption}>{recibido ? 'Reclama: ' : 'Publicó: '}</Text>
          {otro.nombre || 'Usuario'}
        </Text>
      </View>

      {reclamo.respuestaPregunta || reclamo.descripcion || barrio || reclamo.fotoUrl ? (
        <View style={styles.evidenceBox}>
          {reclamo.respuestaPregunta ? (
            <View>
              <Text style={typography.overline}>Respuesta a la verificación</Text>
              <Text style={styles.body}>{reclamo.respuestaPregunta}</Text>
            </View>
          ) : null}
          {reclamo.descripcion ? (
            <View>
              <Text style={typography.overline}>Descripción</Text>
              <Text style={styles.body}>{reclamo.descripcion}</Text>
            </View>
          ) : null}
          {barrio ? (
            <View style={styles.barrioRow}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.body}>Lo encontró en {barrio}</Text>
            </View>
          ) : null}
          {reclamo.fotoUrl ? (
            <Image
              source={{ uri: resolverUrlFoto(reclamo.fotoUrl) }}
              style={styles.evidence}
              accessibilityLabel="Foto adjunta al reclamo"
            />
          ) : null}
        </View>
      ) : null}

      {vence ? (
        <View style={[styles.deadline, vence.urgente && styles.deadlineUrgent]}>
          <Ionicons
            name="time-outline"
            size={16}
            color={vence.urgente ? colors.error : colors.warning}
          />
          <Text style={[styles.deadlineText, { color: vence.urgente ? colors.error : colors.warning }]}>
            {vence.texto}
          </Text>
          <Text style={styles.deadlineHint}>
            {recibido ? 'para responder' : 'sin respuesta'}
          </Text>
        </View>
      ) : null}

      {recibido && reclamo.estado === 'pendiente' ? (
        <View style={styles.actions}>
          <Button
            title="Rechazar"
            variant="danger"
            icon="close"
            onPress={() => onDecision(reclamo, 'rechazar')}
            loading={accionEnCurso === 'rechazar'}
            disabled={sinConexion || (enCurso && accionEnCurso !== 'rechazar')}
            style={styles.flex}
          />
          <Button
            title="Aceptar"
            icon="checkmark"
            onPress={() => onDecision(reclamo, 'aceptar')}
            loading={accionEnCurso === 'aceptar'}
            disabled={sinConexion || (enCurso && accionEnCurso !== 'aceptar')}
            style={styles.flex}
          />
        </View>
      ) : null}
      {!recibido && reclamo.estado === 'pendiente' ? (
        <Text style={typography.caption}>
          Esperando que {otro.nombre || 'la otra persona'} responda tu reclamo.
        </Text>
      ) : null}

      {reclamo.estado === 'rechazado' ? (
        <Text style={typography.caption}>
          {recibido ? 'Rechazaste este reclamo.' : 'El publicador rechazó este reclamo.'}
        </Text>
      ) : null}
      {reclamo.estado === 'vencido' ? (
        <Text style={typography.caption}>Venció sin respuesta a las 48 horas.</Text>
      ) : null}

      {entregaConfirmada ? (
        <View style={styles.resolved}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.resolvedText}>
            Entrega confirmada{reclamo.fechaResolucion ? ` el ${formatFechaHora(reclamo.fechaResolucion)}` : ''}.
          </Text>
        </View>
      ) : null}

      {reclamo.estado === 'aceptado' && !entregaConfirmada ? (
        <View style={styles.actionsColumn}>
          <Button
            title="Coordinar devolución"
            icon="navigate-outline"
            onPress={() => onOpenEncuentro(reclamo)}
          />
          <Button
            title={soyTitular ? 'Mostrar QR' : 'Escanear QR'}
            icon={soyTitular ? 'qr-code-outline' : 'scan-outline'}
            variant="secondary"
            onPress={() => (soyTitular ? onMostrarQr(reclamo) : onConfirmarEntrega(reclamo))}
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md - 4 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  pressed: { opacity: 0.85 },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  titleColumn: { flex: 1, gap: spacing.xs },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs + 2 },
  title: { ...typography.subheading },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personName: { ...typography.bodyStrong, flex: 1 },
  evidenceBox: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md - 4,
    gap: spacing.sm,
  },
  body: { ...typography.body },
  barrioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  evidence: { width: '100%', height: 170, borderRadius: radius.md, backgroundColor: colors.surface },
  deadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.warningSoft,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm,
  },
  deadlineUrgent: { backgroundColor: colors.errorSoft },
  deadlineText: { fontSize: 14, fontWeight: '700' },
  deadlineHint: { ...typography.caption },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  actionsColumn: { gap: spacing.sm },
  resolved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radius.md,
    padding: spacing.md - 4,
  },
  resolvedText: { ...typography.bodyStrong, color: colors.success, flex: 1 },
});
