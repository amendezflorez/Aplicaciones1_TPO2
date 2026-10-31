import { Image, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '../config/env';
import { colors, radius, spacing } from '../config/theme';
import Avatar from './Avatar';
import Button from './Button';

function resolveImageUri(uri) {
  if (!uri || uri.startsWith('http')) return uri;
  return `${API_BASE_URL.replace(/\/api\/?$/, '')}${uri.startsWith('/') ? '' : '/'}${uri}`;
}

const ESTADOS = {
  pendiente: 'Pendiente',
  aceptado: 'Aceptado',
  rechazado: 'Rechazado',
  vencido: 'Vencido',
};

export default function ReclamoCard({ reclamo, recibido, onDecision, busy, sinConexion }) {
  const persona = recibido
    ? { name: reclamo.autorNombre, photoUrl: reclamo.autorFotoUrl }
    : { name: reclamo.publicadorNombre, photoUrl: reclamo.publicadorFotoUrl };
  const tipo = reclamo.tipo === 'es_mio' ? 'Es mío' : 'Lo encontré';
  const vence = reclamo.venceEn ? new Date(reclamo.venceEn).toLocaleString() : null;

  return (
    <View style={styles.card}>
      <View style={styles.heading}>
        <View style={styles.titleColumn}>
          <Text style={styles.title} numberOfLines={2}>{reclamo.publicacionTitulo}</Text>
          <Text style={styles.meta}>{tipo} · {new Date(reclamo.creadaEn).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.status, styles[`status_${reclamo.estado}`]]}>
          {ESTADOS[reclamo.estado] || reclamo.estado}
        </Text>
      </View>

      <View style={styles.person}>
        <Avatar uri={resolveImageUri(persona.photoUrl)} name={persona.name || ''} size={36} />
        <Text style={styles.personName}>{recibido ? 'De' : 'Publicador'}: {persona.name || 'Usuario'}</Text>
      </View>

      {reclamo.respuestaPregunta ? (
        <Text style={styles.body}><Text style={styles.label}>Respuesta: </Text>{reclamo.respuestaPregunta}</Text>
      ) : null}
      {reclamo.descripcion ? (
        <Text style={styles.body}><Text style={styles.label}>Descripción: </Text>{reclamo.descripcion}</Text>
      ) : null}
      {reclamo.barrioEncontrado?.name ? (
        <Text style={styles.body}><Text style={styles.label}>Lo encontró en: </Text>{reclamo.barrioEncontrado.name}</Text>
      ) : null}
      {reclamo.fotoUrl ? (
        <Image source={{ uri: resolveImageUri(reclamo.fotoUrl) }} style={styles.evidence} />
      ) : null}

      {recibido && reclamo.estado === 'pendiente' ? (
        <>
          <Text style={styles.deadline}>Responder antes de {vence}</Text>
          <View style={styles.actions}>
            <Button
              title="Rechazar"
              variant="secondary"
              onPress={() => onDecision(reclamo, 'rechazar')}
              loading={busy}
              disabled={sinConexion}
            />
            <Button
              title="Aceptar"
              onPress={() => onDecision(reclamo, 'aceptar')}
              loading={busy}
              disabled={sinConexion}
            />
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  titleColumn: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  meta: { color: colors.textMuted, fontSize: 13 },
  status: { overflow: 'hidden', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4, fontSize: 12, fontWeight: '700' },
  status_pendiente: { color: '#854D0E', backgroundColor: '#FEF3C7' },
  status_aceptado: { color: '#166534', backgroundColor: '#DCFCE7' },
  status_rechazado: { color: '#991B1B', backgroundColor: '#FEE2E2' },
  status_vencido: { color: colors.textMuted, backgroundColor: colors.surface },
  person: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  personName: { flex: 1, color: colors.text, fontSize: 14 },
  body: { color: colors.text, fontSize: 14, lineHeight: 20 },
  label: { fontWeight: '700' },
  evidence: { width: '100%', height: 190, borderRadius: radius.sm, backgroundColor: colors.surface },
  deadline: { color: colors.textMuted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});