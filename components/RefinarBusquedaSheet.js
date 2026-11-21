import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing, typography } from '../config/theme';
import { useUbicacionActual } from '../hooks/useUbicacionActual';
import { getErrorMessage } from '../services/errors';
import { getBarrios } from '../services/userService';
import { paramsDeFecha, RADIO_KM_POR_DEFECTO } from '../utils/busqueda';
import BarrioOUbicacionPicker from './BarrioOUbicacionPicker';
import Button from './Button';
import CategoriaPicker from './CategoriaPicker';
import Chip from './Chip';
import RangoFechaPicker from './RangoFechaPicker';
import SectionHeader from './SectionHeader';
import { InlineMessage } from './StateViews';
import TextField from './TextField';

// Qué tipo de publicaciones se listan. En el backend, tipoBuscado es lo que la persona hizo
// ("perdí" = ver lo que otros encontraron), por eso las etiquetas hablan de lo que se ve.
const VISTAS = [
  { id: 'todos', label: 'Todo' },
  { id: 'perdido', label: 'Cosas encontradas' },
  { id: 'encontrado', label: 'Cosas perdidas' },
];

// Hoja inferior con los filtros de Resultados (Refinar): categoría, palabras clave, lugar y
// fecha. El tipo (perdí/encontré) solo se cambia al explorar sin filtrar (tipoBuscado
// 'todos' o alguno de sus dos recortes); en una búsqueda guiada es fijo.
export default function RefinarBusquedaSheet({ visible, onClose, ...resto }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* El contenido solo existe mientras está abierta: cada apertura parte de los filtros
          vigentes (no de lo que quedó a medio editar la vez anterior). */}
      {visible ? <Contenido onClose={onClose} {...resto} /> : null}
    </Modal>
  );
}

function Contenido({ filtros, barrioNombre, puedeCambiarTipo, onClose, onAplicar }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [tipoBuscado, setTipoBuscado] = useState(filtros.tipoBuscado);
  const [categoria, setCategoria] = useState(filtros.categoria ?? null);
  const [texto, setTexto] = useState(filtros.texto ?? '');
  const [barrioId, setBarrioId] = useState(filtros.barrioId ?? null);
  const [usaUbic, setUsaUbic] = useState(filtros.lat != null && filtros.lng != null);
  const [radioKm, setRadioKm] = useState(filtros.radioKm ?? RADIO_KM_POR_DEFECTO);
  const [rango, setRango] = useState(filtros.rango ?? null);
  const [desde, setDesde] = useState(filtros.desde ? new Date(filtros.desde) : null);
  const [hasta, setHasta] = useState(filtros.hasta ? new Date(filtros.hasta) : null);
  const [errorFechas, setErrorFechas] = useState('');
  const [barrios, setBarrios] = useState([]);
  const [errorBarrios, setErrorBarrios] = useState('');
  const { ubicacion, cargando, error: errorUbicacion, obtenerUbicacion, limpiarUbicacion } = useUbicacionActual();

  const cargarBarrios = useCallback(() => {
    setErrorBarrios('');
    getBarrios()
      .then(setBarrios)
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    getBarrios()
      .then(setBarrios)
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  }, []);

  const usarUbicacion = async () => {
    const coords = await obtenerUbicacion();
    if (coords) {
      setBarrioId(null);
      setUsaUbic(true);
    }
  };

  const limpiar = () => {
    setCategoria(null);
    setTexto('');
    setBarrioId(null);
    setUsaUbic(false);
    limpiarUbicacion();
    setRango(null);
    setDesde(null);
    setHasta(null);
    setErrorFechas('');
  };

  const aplicar = () => {
    if (rango === 'personalizado' && (!desde || !hasta)) {
      setErrorFechas('Elegí las dos fechas del rango, o usá otra opción.');
      return;
    }
    if (rango === 'personalizado' && desde > hasta) {
      setErrorFechas('La fecha "Desde" no puede ser posterior a "Hasta".');
      return;
    }
    // La ubicación: la que acaba de leerse o, si no se tocó, la que ya traían los filtros.
    const coords = usaUbic ? (ubicacion ?? (filtros.lat != null ? { lat: filtros.lat, lng: filtros.lng } : null)) : null;
    const nuevosFiltros = {
      tipoBuscado: puedeCambiarTipo ? tipoBuscado : filtros.tipoBuscado,
      categoria: categoria ?? undefined,
      texto: texto.trim() || undefined,
      barrioId: coords ? undefined : (barrioId ?? undefined),
      lat: coords?.lat,
      lng: coords?.lng,
      radioKm: coords ? radioKm : undefined,
      ...paramsDeFecha(rango, desde, hasta),
    };
    const nombre = nuevosFiltros.barrioId ? (barrios.find((b) => b.id === nuevosFiltros.barrioId)?.name ?? barrioNombre ?? null) : null;
    onAplicar(nuevosFiltros, nombre);
  };

  return (
      <View style={styles.overlay}>
        <Pressable style={styles.fondo} onPress={onClose} accessibilityLabel="Cerrar filtros" />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {/* maxHeight en dp (no en %): el padre no tiene alto fijo, un % no se resolvería. */}
          <View style={[styles.hoja, { maxHeight: height * 0.9, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.asa} />
            <View style={styles.cabecera}>
              <Text style={styles.titulo}>Refinar búsqueda</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cerrar" style={styles.cerrar}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={styles.contenido} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {puedeCambiarTipo ? (
                <>
                  <SectionHeader title="Qué querés ver" />
                  <View style={styles.chips}>
                    {VISTAS.map((v) => (
                      <Chip key={v.id} label={v.label} selected={tipoBuscado === v.id} onPress={() => setTipoBuscado(v.id)} />
                    ))}
                  </View>
                </>
              ) : null}

              <SectionHeader title="Categoría" />
              <CategoriaPicker compact selected={categoria} onSelect={setCategoria} />

              <SectionHeader title="Palabras clave" />
              <TextField icon="search" placeholder="Ej: llavero, mochila azul…" value={texto} onChangeText={setTexto} />

              <SectionHeader title="Dónde" />
              {errorBarrios ? (
                <View style={styles.errorBarrios}>
                  <InlineMessage tone="error" message={`No pudimos cargar los barrios. ${errorBarrios}`} />
                  <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" onPress={cargarBarrios} />
                </View>
              ) : null}
              <BarrioOUbicacionPicker
                barrios={barrios}
                barrioId={barrioId}
                onSelectBarrio={(b) => {
                  setBarrioId(b.id);
                  setUsaUbic(false);
                }}
                onQuitarBarrio={() => setBarrioId(null)}
                ubicacion={usaUbic ? (ubicacion ?? { lat: filtros.lat, lng: filtros.lng }) : null}
                cargandoUbicacion={cargando}
                error={errorUbicacion}
                onUsarUbicacion={usarUbicacion}
                onQuitarUbicacion={() => {
                  setUsaUbic(false);
                  limpiarUbicacion();
                }}
                radioKm={radioKm}
                onChangeRadio={setRadioKm}
              />

              <SectionHeader title="Cuándo" />
              <RangoFechaPicker
                rango={rango}
                onSelectRango={(r) => {
                  setRango(r);
                  setErrorFechas('');
                }}
                desde={desde}
                hasta={hasta}
                onChangeDesde={setDesde}
                onChangeHasta={setHasta}
              />
              <InlineMessage tone="error" message={errorFechas} />
            </ScrollView>

            <View style={styles.pie}>
              <Button title="Limpiar" variant="ghost" onPress={limpiar} style={styles.botonLimpiar} />
              <Button title="Aplicar filtros" icon="checkmark" onPress={aplicar} style={styles.botonAplicar} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  fondo: {
    ...StyleSheet.absoluteFillObject,
  },
  hoja: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
  },
  asa: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.round,
    backgroundColor: colors.borderStrong,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  titulo: {
    ...typography.title,
  },
  cerrar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // flexShrink: dentro de una hoja con maxHeight, sin esto el ScrollView crece al alto de su
  // contenido y empuja la cabecera y el pie fuera de la pantalla.
  scroll: {
    flexShrink: 1,
  },
  contenido: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  errorBarrios: {
    gap: spacing.sm,
  },
  pie: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  botonLimpiar: {
    flex: 1,
  },
  botonAplicar: {
    flex: 2,
  },
});
