import { StyleSheet, Text, View } from 'react-native';
import BarrioPicker from './BarrioPicker';
import Button from './Button';
import { colors, spacing } from '../config/theme';

// Reusa BarrioPicker (Punto 2) + un botón "Usar mi ubicación" (expo-location vía
// useUbicacionActual, que vive en la pantalla para poder compartir el hook). Barrio y
// ubicación son mutuamente excluyentes: elegir uno limpia el otro (lo maneja quien use
// este componente, pasando los handlers ya preparados).
//
// `error` es el objeto { tipo, mensaje } que devuelve useUbicacionActual (no un booleano
// "permisoDenegado"): distingue permiso denegado (con botón para abrir la configuración),
// servicios de ubicación apagados y sin señal/timeout, cada uno con su propio mensaje.
export default function BarrioOUbicacionPicker({
  barrios,
  barrioId,
  onSelectBarrio,
  ubicacion,
  cargandoUbicacion,
  error,
  onUsarUbicacion,
  onQuitarUbicacion,
  onAbrirConfiguracion,
}) {
  return (
    <View style={styles.container}>
      <BarrioPicker barrios={barrios} selectedId={barrioId} onSelect={onSelectBarrio} />
      <Text style={styles.o}>— o —</Text>
      {ubicacion ? (
        <View style={styles.ubicacionRow}>
          <Text style={styles.ubicacionText}>📍 Usando tu ubicación actual</Text>
          <Button title="Quitar" variant="secondary" onPress={onQuitarUbicacion} />
        </View>
      ) : (
        <Button
          title="Usar mi ubicación"
          variant="secondary"
          onPress={onUsarUbicacion}
          loading={cargandoUbicacion}
        />
      )}
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.error}>{error.mensaje}</Text>
          {error.tipo === 'permiso' ? (
            <Button title="Abrir configuración" variant="secondary" onPress={onAbrirConfiguracion} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  o: {
    textAlign: 'center',
    color: colors.textMuted,
    fontSize: 13,
  },
  ubicacionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  ubicacionText: {
    color: colors.text,
    fontSize: 15,
  },
  errorBox: {
    gap: spacing.xs,
  },
  error: {
    color: colors.error,
    fontSize: 13,
  },
});
