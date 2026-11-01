import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';
import { formatFechaRelativa } from '../utils/publicacionFormatters';
import Avatar from './Avatar';
import Button from './Button';

export default function CasoHistorialCard({ caso, onValorar, onVerPerfil, sinConexion }) {
  const esDevolvi = caso.tipo === 'devolvi';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.tituloCol}>
          <Text style={styles.titulo} numberOfLines={2}>
            {caso.publicacionTitulo}
          </Text>
          <Text style={styles.meta}>
            {caso.publicacionCategoria ? `${caso.publicacionCategoria} · ` : ''}
            Resuelto {formatFechaRelativa(caso.fechaResolucion)}
          </Text>
        </View>
        <View style={[styles.badgeTipo, esDevolvi ? styles.badgeDevolvi : styles.badgeRecupere]}>
          <Text style={[styles.badgeTipoTexto, esDevolvi ? styles.badgeDevolviTexto : styles.badgeRecupereTexto]}>
            {esDevolvi ? '🤝 Devolviste' : '🎉 Recuperaste'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.contraparte}
        onPress={() => onVerPerfil(caso.contraparte.id)}
        activeOpacity={0.7}
      >
        <Avatar uri={caso.contraparte.photoUrl} name={caso.contraparte.name} size={36} />
        <View style={styles.contraparteInfo}>
          <Text style={styles.contraparteLabel}>
            {esDevolvi ? 'Se lo entregaste a:' : 'Te lo devolvió:'}
          </Text>
          <Text style={styles.contraparteNombre}>{caso.contraparte.name}</Text>
        </View>
        <Text style={styles.verPerfil}>Ver perfil ›</Text>
      </TouchableOpacity>

      <View style={styles.seccionValoracion}>
        {caso.miValoracion ? (
          <View style={styles.valoracionBox}>
            <View style={styles.valoracionHeader}>
              <Text style={styles.valoracionTitulo}>Tu valoración a {caso.contraparte.name}:</Text>
              <Text style={[styles.chipCalificacion, caso.miValoracion.positiva ? styles.chipPositiva : styles.chipNegativa]}>
                {caso.miValoracion.positiva ? '👍 Positiva' : '👎 Negativa'}
              </Text>
            </View>
            {caso.miValoracion.comentario ? (
              <Text style={styles.comentarioTexto}>
                {`"${caso.miValoracion.comentario}"`}
              </Text>
            ) : null}
            {caso.miValoracion.agradecimientoPublico ? (
              <View style={styles.agradecimientoBox}>
                <Text style={styles.agradecimientoLabel}>Agradecimiento público:</Text>
                <Text style={styles.agradecimientoTexto}>
                  {`"${caso.miValoracion.agradecimientoPublico}"`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : caso.puedeValorar ? (
          <View style={styles.pendienteBox}>
            <View style={styles.pendienteInfo}>
              <Text style={styles.pendienteTitulo}>Valoración pendiente</Text>
              <Text style={styles.pendienteSub}>
                Tenés {caso.diasRestantesParaValorar} {caso.diasRestantesParaValorar === 1 ? 'día restante' : 'días restantes'} para calificar a tu contraparte.
              </Text>
            </View>
            <Button
              title={`Valorar a ${caso.contraparte.name}`}
              onPress={() => onValorar(caso)}
              disabled={sinConexion}
            />
          </View>
        ) : (
          <Text style={styles.plazoVencido}>
            El plazo de 7 días para valorar este caso ha expirado.
          </Text>
        )}

        {caso.valoracionRecibida ? (
          <View style={styles.recibidaBox}>
            <Text style={styles.recibidaTitulo}>
              {caso.contraparte.name} te calificó: {caso.valoracionRecibida.positiva ? '👍 Positivo' : '👎 Negativo'}
            </Text>
            {caso.valoracionRecibida.comentario ? (
              <Text style={styles.comentarioTexto}>
                {`"${caso.valoracionRecibida.comentario}"`}
              </Text>
            ) : null}
            {caso.valoracionRecibida.agradecimientoPublico ? (
              <View style={styles.agradecimientoBox}>
                <Text style={styles.agradecimientoLabel}>Te dejó este agradecimiento público:</Text>
                <Text style={styles.agradecimientoTexto}>
                  {`"${caso.valoracionRecibida.agradecimientoPublico}"`}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  tituloCol: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  badgeTipo: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeDevolvi: {
    backgroundColor: '#DCFCE7',
  },
  badgeDevolviTexto: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeRecupere: {
    backgroundColor: '#E0F2FE',
  },
  badgeRecupereTexto: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  contraparte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.surface,
  },
  contraparteInfo: {
    flex: 1,
  },
  contraparteLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  contraparteNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  verPerfil: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  seccionValoracion: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  valoracionBox: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: 4,
  },
  valoracionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valoracionTitulo: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  chipCalificacion: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontSize: 11,
    fontWeight: '700',
  },
  chipPositiva: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
  },
  chipNegativa: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
  },
  comentarioTexto: {
    fontSize: 13,
    color: colors.text,
    fontStyle: 'italic',
  },
  agradecimientoBox: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  agradecimientoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  agradecimientoTexto: {
    fontSize: 12,
    color: colors.primaryDark,
    fontStyle: 'italic',
  },
  pendienteBox: {
    backgroundColor: '#FEF3C7',
    padding: spacing.sm,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  pendienteInfo: {
    gap: 2,
  },
  pendienteTitulo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400E',
  },
  pendienteSub: {
    fontSize: 12,
    color: '#B45309',
  },
  plazoVencido: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: spacing.xs,
  },
  recibidaBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginTop: 4,
    gap: 4,
  },
  recibidaTitulo: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
});

