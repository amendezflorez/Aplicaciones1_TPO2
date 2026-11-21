import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '../config/theme';
import { RADIOS_KM } from '../utils/busqueda';
import { FilaBarrio, filtrarBarrios } from './BarrioPicker';
import Chip from './Chip';
import PermisoDenegado from './PermisoDenegado';
import { InlineMessage } from './StateViews';
import TextField from './TextField';

// Máximo de barrios que se listan sin buscar: la lista completa es larga y empuja todo lo
// demás fuera de la pantalla; al escribir en el buscador se listan todos los que coinciden.
const BARRIOS_SIN_BUSCAR = 8;

// "Dónde": o un barrio (lista con buscador) o "Usar mi ubicación" (con radio). Son
// mutuamente excluyentes: elegir uno limpia el otro (lo maneja quien use este componente,
// pasando los handlers ya preparados).
//
// `error` es el objeto { tipo, mensaje } que devuelve useUbicacionActual: distingue permiso
// denegado (PermisoDenegado, con botón para abrir la configuración), servicios de ubicación
// apagados y sin señal/timeout, cada uno con su propio mensaje.
export default function BarrioOUbicacionPicker({
  barrios,
  barrioId,
  onSelectBarrio,
  onQuitarBarrio,
  ubicacion,
  cargandoUbicacion,
  error,
  onUsarUbicacion,
  onQuitarUbicacion,
  radioKm,
  onChangeRadio,
}) {
  const [consulta, setConsulta] = useState('');
  const visibles = useMemo(() => {
    const filtrados = filtrarBarrios(barrios, consulta);
    return consulta.trim() ? filtrados : filtrados.slice(0, BARRIOS_SIN_BUSCAR);
  }, [barrios, consulta]);
  const hayMas = !consulta.trim() && barrios.length > BARRIOS_SIN_BUSCAR;
  const seleccionado = barrios.find((b) => b.id === barrioId);

  return (
    <View style={styles.container}>
      {ubicacion ? (
        <View style={[styles.opcion, styles.opcionActiva]}>
          <View style={[styles.icono, styles.iconoActivo]}>
            <Ionicons name="locate" size={22} color={colors.white} />
          </View>
          <View style={styles.textos}>
            <Text style={styles.opcionTitulo}>Usando tu ubicación</Text>
            <Text style={styles.opcionTexto}>Mostramos lo que hay cerca tuyo.</Text>
          </View>
          <Pressable onPress={onQuitarUbicacion} hitSlop={8} accessibilityRole="button" accessibilityLabel="Quitar ubicación">
            <Text style={styles.quitar}>Quitar</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onUsarUbicacion}
          disabled={cargandoUbicacion}
          accessibilityRole="button"
          accessibilityLabel="Usar mi ubicación"
          style={({ pressed }) => [styles.opcion, pressed && { opacity: 0.85 }]}
        >
          <View style={styles.icono}>
            <Ionicons name="locate-outline" size={22} color={colors.primary} />
          </View>
          <View style={styles.textos}>
            <Text style={styles.opcionTitulo}>{cargandoUbicacion ? 'Buscando tu ubicación…' : 'Usar mi ubicación'}</Text>
            <Text style={styles.opcionTexto}>Ideal si estás cerca de donde pasó.</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      )}

      {ubicacion && onChangeRadio ? (
        <View style={styles.radio}>
          <Text style={styles.subtitulo}>Distancia máxima</Text>
          <View style={styles.chips}>
            {RADIOS_KM.map((km) => (
              <Chip key={km} label={`${km} km`} selected={radioKm === km} onPress={() => onChangeRadio(km)} />
            ))}
          </View>
        </View>
      ) : null}

      {error?.tipo === 'permiso' ? (
        <PermisoDenegado
          icon="location-outline"
          titulo="Necesitamos permiso de ubicación"
          motivo="Sin tu ubicación no podemos mostrarte lo que hay cerca. Habilitala en la configuración o elegí un barrio de la lista."
        />
      ) : error ? (
        <InlineMessage tone="warning" message={error.mensaje} />
      ) : null}

      {!ubicacion ? (
        <View style={styles.barrios}>
          <Text style={styles.o}>o elegí un barrio</Text>
          {seleccionado ? (
            <View style={styles.seleccionado}>
              <Chip label={seleccionado.name} icon="location" selected />
              {onQuitarBarrio ? (
                <Pressable onPress={onQuitarBarrio} hitSlop={8} accessibilityRole="button" accessibilityLabel="Quitar barrio">
                  <Text style={styles.quitar}>Quitar</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <TextField
            icon="search"
            placeholder="Buscar barrio"
            value={consulta}
            onChangeText={setConsulta}
            autoCorrect={false}
          />
          <View style={styles.lista}>
            {visibles.map((b) => (
              <FilaBarrio key={b.id} barrio={b} activo={b.id === barrioId} onPress={onSelectBarrio} />
            ))}
            {visibles.length === 0 ? (
              <Text style={styles.vacio}>
                {barrios.length === 0
                  ? 'Todavía no pudimos cargar los barrios.'
                  : `No encontramos barrios que coincidan con "${consulta}".`}
              </Text>
            ) : null}
          </View>
          {hayMas ? <Text style={styles.ayuda}>Escribí arriba para buscar entre los {barrios.length} barrios.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  opcion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.md - 4,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    ...shadow.sm,
  },
  opcionActiva: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  icono: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconoActivo: {
    backgroundColor: colors.primary,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  opcionTitulo: {
    ...typography.subheading,
  },
  opcionTexto: {
    ...typography.caption,
  },
  quitar: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  radio: {
    gap: spacing.sm,
  },
  subtitulo: {
    ...typography.label,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  barrios: {
    gap: spacing.sm + 2,
  },
  o: {
    ...typography.overline,
    textAlign: 'center',
  },
  seleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lista: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  vacio: {
    ...typography.body,
    color: colors.textMuted,
    padding: spacing.md,
    textAlign: 'center',
  },
  ayuda: {
    ...typography.caption,
    textAlign: 'center',
  },
});
