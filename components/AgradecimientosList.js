import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../config/theme';
import { getErrorMessage } from '../services/errors';
import { getAgradecimientosUsuario } from '../services/historialService';
import { formatFechaRelativa } from '../utils/publicacionFormatters';
import Avatar from './Avatar';
import Button from './Button';
import { InlineMessage, Skeleton } from './StateViews';

// Agradecimientos públicos recibidos por un usuario. Cada estado se muestra por separado:
// cargando (esqueleto), error (aviso con "Reintentar", nunca se finge una lista vacía),
// vacío (texto breve) o la lista. refreshKey permite al padre forzar una recarga
// (pull-to-refresh del perfil).
export default function AgradecimientosList({ userId, refreshKey = 0, esPropio = false }) {
  const [agradecimientos, setAgradecimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // La carga en sí no toca el estado de forma síncrona (lo hace "reintentar"), así se puede
  // llamar desde el efecto sin renders en cascada.
  const traer = useCallback(
    () =>
      getAgradecimientosUsuario(userId)
        .then((data) => {
          setAgradecimientos(data);
          setError('');
        })
        .catch((e) => setError(getErrorMessage(e)))
        .finally(() => setLoading(false)),
    [userId]
  );

  useEffect(() => {
    traer();
  }, [traer, refreshKey]);

  const reintentar = () => {
    setError('');
    setLoading(true);
    traer();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.seccionTitulo} accessibilityRole="header">
        Agradecimientos recibidos{!loading && !error && agradecimientos.length > 0 ? ` (${agradecimientos.length})` : ''}
      </Text>

      {loading && agradecimientos.length === 0 ? (
        <Skeleton height={78} radius={radius.lg} />
      ) : error ? (
        <View style={styles.errorBox}>
          <InlineMessage tone="error" message={`No pudimos cargar los agradecimientos. ${error}`} />
          <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" onPress={reintentar} style={styles.retry} />
        </View>
      ) : agradecimientos.length === 0 ? (
        <View style={styles.vacio}>
          <Ionicons name="heart-outline" size={20} color={colors.textMuted} />
          <Text style={styles.vacioText}>
            {esPropio
              ? 'Cuando alguien te agradezca una devolución, lo vas a ver acá.'
              : 'Todavía no recibió agradecimientos.'}
          </Text>
        </View>
      ) : (
        <View style={styles.lista}>
          {agradecimientos.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.header}>
                <Avatar uri={item.autorFotoUrl} name={item.autorNombre} size={36} />
                <View style={styles.headerInfo}>
                  <Text style={styles.autorNombre}>{item.autorNombre}</Text>
                  <Text style={styles.meta} numberOfLines={2}>
                    Recuperó &quot;{item.objeto}&quot; · {formatFechaRelativa(item.fecha)}
                  </Text>
                </View>
              </View>
              <Text style={styles.mensaje}>{`"${item.mensaje}"`}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm + 2,
  },
  seccionTitulo: {
    ...typography.overline,
    marginTop: spacing.sm,
  },
  lista: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  headerInfo: {
    flex: 1,
  },
  autorNombre: {
    ...typography.bodyStrong,
  },
  meta: {
    ...typography.caption,
  },
  mensaje: {
    ...typography.body,
    color: colors.textSecondary,
    fontStyle: 'italic',
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  vacio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  vacioText: {
    ...typography.caption,
    flex: 1,
  },
  errorBox: {
    gap: spacing.sm,
  },
  retry: {
    alignSelf: 'flex-start',
  },
});
