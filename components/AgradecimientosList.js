import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../config/theme';
import { getAgradecimientosUsuario } from '../services/historialService';
import { formatFechaRelativa } from '../utils/publicacionFormatters';
import Avatar from './Avatar';

export default function AgradecimientosList({ userId }) {
  const [agradecimientos, setAgradecimientos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    getAgradecimientosUsuario(userId)
      .then((data) => {
        if (!cancel) setAgradecimientos(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [userId]);

  if (loading || agradecimientos.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.seccionTitulo}>
        Agradecimientos recibidos ({agradecimientos.length})
      </Text>
      <View style={styles.lista}>
        {agradecimientos.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.header}>
              <Avatar uri={item.autorFotoUrl} name={item.autorNombre} size={32} />
              <View style={styles.headerInfo}>
                <Text style={styles.autorNombre}>{item.autorNombre}</Text>
                <Text style={styles.meta}>
                  Recuperó &quot;{item.objeto}&quot; · {formatFechaRelativa(item.fecha)}
                </Text>
              </View>
            </View>
            <Text style={styles.mensaje}>
              {`"${item.mensaje}"`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  seccionTitulo: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  lista: {
    gap: spacing.sm,
  },
  card: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  autorNombre: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  mensaje: {
    fontSize: 14,
    color: colors.primaryDark,
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 2,
  },
});

