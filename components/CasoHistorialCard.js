import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIAS } from '../config/constants';
import { colors, radius, spacing, typography } from '../config/theme';
import { formatFecha } from '../utils/publicacionFormatters';
import Avatar from './Avatar';
import Button from './Button';
import Card from './Card';
import Chip from './Chip';
import FotoPublicacion from './FotoPublicacion';

// Caso resuelto del Historial (Punto 10): objeto, fecha absoluta, contraparte (abre su
// perfil público) y estado de la valoración (pendiente con plazo / hecha / vencida).
export default function CasoHistorialCard({ caso, onValorar, onVerPerfil, sinConexion }) {
  const esDevolvi = caso.tipo === 'devolvi';
  const categoria = CATEGORIAS.find((c) => c.id === caso.publicacionCategoria)?.label ?? caso.publicacionCategoria;
  const nombre = caso.contraparte.name;
  const dias = caso.diasRestantesParaValorar;

  return (
    <Card padded={false}>
      <View style={styles.header}>
        <FotoPublicacion url={caso.publicacionFotoPrincipalUrl} style={styles.foto} iconSize={22} />
        <View style={styles.headerInfo}>
          <Chip
            label={esDevolvi ? 'Devolviste' : 'Recuperaste'}
            tone={esDevolvi ? 'primary' : 'accent'}
            icon={esDevolvi ? 'hand-left' : 'checkmark-circle'}
            size="sm"
          />
          <Text style={styles.titulo} numberOfLines={2}>
            {caso.publicacionTitulo}
          </Text>
          <View style={styles.fila}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.meta} numberOfLines={1}>
              {`${categoria ? `${categoria} · ` : ''}${formatFecha(caso.fechaResolucion, { conAnio: true })}`}
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.contraparte, pressed && { backgroundColor: colors.primarySoft }]}
        onPress={() => onVerPerfil(caso.contraparte.id)}
        accessibilityRole="button"
        accessibilityLabel={`Ver el perfil de ${nombre}`}
      >
        <Avatar uri={caso.contraparte.photoUrl} name={nombre} size={40} />
        <View style={styles.contraparteInfo}>
          <Text style={styles.contraparteLabel}>{esDevolvi ? 'Se lo entregaste a' : 'Te lo devolvió'}</Text>
          <Text style={styles.contraparteNombre} numberOfLines={1}>
            {nombre}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>

      <View style={styles.valoracion}>
        {caso.miValoracion ? (
          <View style={styles.caja}>
            <View style={styles.fila}>
              <Ionicons
                name={caso.miValoracion.positiva ? 'thumbs-up' : 'thumbs-down'}
                size={18}
                color={caso.miValoracion.positiva ? colors.success : colors.error}
              />
              <Text style={styles.cajaTitulo}>
                {`Valoraste ${caso.miValoracion.positiva ? 'positivo' : 'negativo'} a ${nombre}`}
              </Text>
            </View>
            {caso.miValoracion.comentario ? (
              <Text style={styles.comentario}>{`“${caso.miValoracion.comentario}”`}</Text>
            ) : null}
            {caso.miValoracion.agradecimientoPublico ? (
              <View style={styles.agradecimiento}>
                <Ionicons name="heart" size={14} color={colors.primary} />
                <Text style={styles.agradecimientoTexto}>
                  {`Agradecimiento público: “${caso.miValoracion.agradecimientoPublico}”`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : caso.puedeValorar ? (
          <View style={styles.pendiente}>
            <Button
              title={`Valorar · quedan ${dias} ${dias === 1 ? 'día' : 'días'}`}
              icon="star-outline"
              onPress={() => onValorar(caso)}
              disabled={sinConexion}
            />
            {sinConexion ? <Text style={styles.ayuda}>Necesitás conexión para valorar.</Text> : null}
          </View>
        ) : (
          <View style={styles.fila}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.ayuda}>Pasaron los 7 días para valorar este caso.</Text>
          </View>
        )}

        {caso.valoracionRecibida ? (
          <View style={[styles.caja, styles.cajaRecibida]}>
            <View style={styles.fila}>
              <Ionicons
                name={caso.valoracionRecibida.positiva ? 'thumbs-up' : 'thumbs-down'}
                size={18}
                color={caso.valoracionRecibida.positiva ? colors.success : colors.error}
              />
              <Text style={styles.cajaTitulo}>
                {`${nombre} te valoró ${caso.valoracionRecibida.positiva ? 'positivo' : 'negativo'}`}
              </Text>
            </View>
            {caso.valoracionRecibida.comentario ? (
              <Text style={styles.comentario}>{`“${caso.valoracionRecibida.comentario}”`}</Text>
            ) : null}
            {caso.valoracionRecibida.agradecimientoPublico ? (
              <View style={styles.agradecimiento}>
                <Ionicons name="heart" size={14} color={colors.primary} />
                <Text style={styles.agradecimientoTexto}>
                  {`Te dejó un agradecimiento público: “${caso.valoracionRecibida.agradecimientoPublico}”`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    gap: spacing.md - 4,
    padding: spacing.md,
    paddingBottom: spacing.md - 4,
  },
  foto: {
    width: 72,
    height: 72,
    borderRadius: radius.md,
  },
  headerInfo: {
    flex: 1,
    gap: spacing.xs + 1,
  },
  titulo: {
    ...typography.subheading,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  meta: {
    ...typography.caption,
    flex: 1,
  },
  contraparte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  contraparteInfo: {
    flex: 1,
  },
  contraparteLabel: {
    ...typography.caption,
  },
  contraparteNombre: {
    ...typography.bodyStrong,
  },
  valoracion: {
    gap: spacing.sm,
    padding: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendiente: {
    gap: spacing.xs,
  },
  caja: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md - 4,
    gap: spacing.xs + 2,
  },
  cajaRecibida: {
    backgroundColor: colors.primarySoft,
  },
  cajaTitulo: {
    ...typography.label,
    color: colors.text,
    flex: 1,
  },
  comentario: {
    ...typography.body,
    fontStyle: 'italic',
    color: colors.textSecondary,
  },
  agradecimiento: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    alignItems: 'flex-start',
  },
  agradecimientoTexto: {
    ...typography.caption,
    flex: 1,
    color: colors.primaryDark,
  },
  ayuda: {
    ...typography.caption,
  },
});
