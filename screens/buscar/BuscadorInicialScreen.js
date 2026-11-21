import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BarrioOUbicacionPicker from '../../components/BarrioOUbicacionPicker';
import Button from '../../components/Button';
import Chip from '../../components/Chip';
import CategoriaPicker from '../../components/CategoriaPicker';
import RangoFechaPicker from '../../components/RangoFechaPicker';
import Screen from '../../components/Screen';
import SectionHeader from '../../components/SectionHeader';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import { colors, radius, shadow, spacing, typography } from '../../config/theme';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { getErrorMessage } from '../../services/errors';
import { getBarrios } from '../../services/userService';
import { criteriosDeFiltros, paramsDeFecha, RADIO_KM_POR_DEFECTO, resumenDeFiltros } from '../../utils/busqueda';

const PASOS = [
  { titulo: '¿Qué te pasó?', subtitulo: 'Elegí una opción para empezar a buscar.' },
  { titulo: '¿Qué estás buscando?', subtitulo: 'Elegí una categoría y, si querés, sumá palabras clave.' },
  { titulo: '¿Dónde fue?', subtitulo: 'Usá tu ubicación o elegí el barrio donde pasó.' },
  { titulo: '¿Cuándo fue?', subtitulo: 'Acotá la búsqueda a un período, o dejala abierta.' },
];

// Buscador guiado de 4 pasos (Punto 3). useState local nomás: la navegación entre pasos es
// intra-pantalla. Al buscar se navega a Resultados y el asistente se reinicia, así volver
// atrás deja una búsqueda nueva de cero (sin criterios pegados de la anterior).
export default function BuscadorInicialScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [tipoBuscado, setTipoBuscado] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [texto, setTexto] = useState('');
  const [barrioId, setBarrioId] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [errorBarrios, setErrorBarrios] = useState('');
  const [cargandoBarrios, setCargandoBarrios] = useState(false);
  const [radioKm, setRadioKm] = useState(RADIO_KM_POR_DEFECTO);
  const [rango, setRango] = useState(null);
  const [desde, setDesde] = useState(null);
  const [hasta, setHasta] = useState(null);
  const [errorFechas, setErrorFechas] = useState('');

  const { ubicacion, cargando: cargandoUbicacion, error: errorUbicacion, obtenerUbicacion, limpiarUbicacion } =
    useUbicacionActual();
  const { ultimasBusquedas, guardarBusqueda } = useSearchHistory();

  const cargarBarrios = useCallback(async () => {
    setCargandoBarrios(true);
    setErrorBarrios('');
    try {
      setBarrios(await getBarrios());
    } catch (e) {
      setErrorBarrios(getErrorMessage(e));
    } finally {
      setCargandoBarrios(false);
    }
  }, []);

  useEffect(() => {
    getBarrios()
      .then(setBarrios)
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  }, []);

  const reiniciar = () => {
    setStep(0);
    setTipoBuscado(null);
    setCategoria(null);
    setTexto('');
    setBarrioId(null);
    setRadioKm(RADIO_KM_POR_DEFECTO);
    setRango(null);
    setDesde(null);
    setHasta(null);
    setErrorFechas('');
    limpiarUbicacion();
  };

  const usarUbicacion = async () => {
    const coords = await obtenerUbicacion();
    if (coords) setBarrioId(null);
  };

  const nombreBarrio = (id) => barrios.find((b) => b.id === id)?.name ?? null;

  const buscar = () => {
    if (rango === 'personalizado' && (!desde || !hasta)) {
      setErrorFechas('Elegí las dos fechas del rango, o usá otra opción.');
      return;
    }
    if (rango === 'personalizado' && desde > hasta) {
      setErrorFechas('La fecha "Desde" no puede ser posterior a "Hasta".');
      return;
    }
    setErrorFechas('');
    const filtros = {
      tipoBuscado,
      categoria: categoria ?? undefined,
      texto: texto.trim() || undefined,
      barrioId: ubicacion ? undefined : (barrioId ?? undefined),
      lat: ubicacion?.lat,
      lng: ubicacion?.lng,
      // Con ubicación hace falta un radio: sin él, la ubicación solo ordenaría y la persona
      // vería publicaciones de toda la ciudad creyendo que son cercanas.
      radioKm: ubicacion ? radioKm : undefined,
      ...paramsDeFecha(rango, desde, hasta),
    };
    const barrioNombre = filtros.barrioId ? nombreBarrio(filtros.barrioId) : null;
    guardarBusqueda(filtros, barrioNombre);
    navigation.navigate('Resultados', { filtros, barrioNombre });
    reiniciar();
  };

  const repetirBusqueda = (busqueda) => {
    navigation.navigate('Resultados', { filtros: busqueda.filtros, barrioNombre: busqueda.barrioNombre });
  };

  const explorar = () => {
    navigation.navigate('Resultados', { filtros: { tipoBuscado: 'todos' } });
  };

  const paso = PASOS[step];
  const ultimo = step === PASOS.length - 1;

  const footer = (
    <View style={styles.footer}>
      {step > 0 ? (
        <Button title="Atrás" icon="arrow-back" variant="secondary" onPress={() => setStep(step - 1)} style={styles.botonAtras} />
      ) : null}
      <Button
        title={ultimo ? 'Buscar' : 'Siguiente'}
        icon={ultimo ? 'search' : undefined}
        iconRight={ultimo ? undefined : 'arrow-forward'}
        onPress={ultimo ? buscar : () => setStep(step + 1)}
        disabled={step === 0 && !tipoBuscado}
        style={styles.botonSiguiente}
      />
    </View>
  );

  return (
    <Screen title={paso.titulo} subtitle={paso.subtitulo} footer={footer}>
      <View style={styles.progreso} accessibilityLabel={`Paso ${step + 1} de ${PASOS.length}`}>
        <View style={styles.barras}>
          {PASOS.map((_, i) => (
            <View key={i} style={[styles.barra, i <= step && styles.barraActiva]} />
          ))}
        </View>
        <Text style={styles.pasoTexto}>
          Paso {step + 1} de {PASOS.length}
        </Text>
      </View>

      {step === 0 ? (
        <>
          <View style={styles.opciones}>
            <TipoCard
              icon="help-circle-outline"
              titulo="Perdí algo"
              texto="Te mostramos lo que otros encontraron."
              tono="perdido"
              activo={tipoBuscado === 'perdido'}
              onPress={() => setTipoBuscado('perdido')}
            />
            <TipoCard
              icon="hand-left-outline"
              titulo="Encontré algo"
              texto="Te mostramos lo que otros están buscando."
              tono="encontrado"
              activo={tipoBuscado === 'encontrado'}
              onPress={() => setTipoBuscado('encontrado')}
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.explorar, pressed && { opacity: 0.8 }]}
            onPress={explorar}
            accessibilityRole="button"
            accessibilityLabel="Explorar todas las publicaciones"
          >
            <Ionicons name="earth-outline" size={20} color={colors.primary} />
            <View style={styles.explorarTextos}>
              <Text style={styles.explorarTitulo}>Explorar todas las publicaciones</Text>
              <Text style={styles.explorarTexto}>Mirá lo perdido y lo encontrado, sin filtrar.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {ultimasBusquedas.length > 0 ? (
            <View style={styles.historial}>
              <SectionHeader title="Últimas búsquedas" />
              {ultimasBusquedas.map((b) => (
                <Pressable
                  key={b.clave ?? b.fecha}
                  style={({ pressed }) => [styles.historialItem, pressed && { opacity: 0.85 }]}
                  onPress={() => repetirBusqueda(b)}
                  accessibilityRole="button"
                  accessibilityLabel={`Repetir búsqueda: ${b.etiqueta}`}
                >
                  <View style={styles.historialIcono}>
                    <Ionicons name="time-outline" size={20} color={colors.primary} />
                  </View>
                  <Text style={styles.historialTexto} numberOfLines={2}>
                    {b.etiqueta ?? resumenDeFiltros(b.filtros, b.barrioNombre)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      ) : null}

      {step === 1 ? (
        <>
          <CategoriaPicker selected={categoria} onSelect={setCategoria} />
          <TextField
            label="Palabras clave (opcional)"
            icon="search"
            placeholder="Ej: llavero, mochila azul…"
            value={texto}
            onChangeText={setTexto}
            returnKeyType="next"
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          {errorBarrios ? (
            <View style={styles.errorBarrios}>
              <InlineMessage tone="error" message={`No pudimos cargar los barrios. ${errorBarrios}`} />
              <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" onPress={cargarBarrios} loading={cargandoBarrios} />
            </View>
          ) : null}
          <BarrioOUbicacionPicker
            barrios={barrios}
            barrioId={barrioId}
            onSelectBarrio={(b) => {
              setBarrioId(b.id);
              limpiarUbicacion();
            }}
            onQuitarBarrio={() => setBarrioId(null)}
            ubicacion={ubicacion}
            cargandoUbicacion={cargandoUbicacion}
            error={errorUbicacion}
            onUsarUbicacion={usarUbicacion}
            onQuitarUbicacion={limpiarUbicacion}
            radioKm={radioKm}
            onChangeRadio={setRadioKm}
          />
          <Text style={styles.ayuda}>Si no elegís nada, buscamos en toda la ciudad.</Text>
        </>
      ) : null}

      {step === 3 ? (
        <>
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
          <SectionHeader title="Tu búsqueda" />
          <View style={styles.resumen}>
            {criteriosDeFiltros(
              {
                tipoBuscado,
                categoria: categoria ?? undefined,
                texto,
                barrioId: ubicacion ? undefined : (barrioId ?? undefined),
                lat: ubicacion?.lat,
                lng: ubicacion?.lng,
                radioKm: ubicacion ? radioKm : undefined,
              },
              nombreBarrio(barrioId)
            ).map((c) => (
              <Chip key={c.key} label={c.label} icon={c.icon} tone="primary" />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function TipoCard({ icon, titulo, texto, tono, activo, onPress }) {
  const color = tono === 'perdido' ? colors.perdido : colors.encontrado;
  const soft = tono === 'perdido' ? colors.perdidoSoft : colors.encontradoSoft;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: activo }}
      accessibilityLabel={`${titulo}. ${texto}`}
      style={({ pressed }) => [
        styles.tipoCard,
        activo && { borderColor: color, backgroundColor: soft },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.tipoIcono, { backgroundColor: activo ? color : soft }]}>
        <Ionicons name={icon} size={34} color={activo ? colors.white : color} />
      </View>
      <View style={styles.tipoTextos}>
        <Text style={styles.tipoTitulo}>{titulo}</Text>
        <Text style={styles.tipoTexto}>{texto}</Text>
      </View>
      <Ionicons
        name={activo ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={activo ? color : colors.borderStrong}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  progreso: {
    gap: spacing.xs + 2,
  },
  barras: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  barra: {
    flex: 1,
    height: 6,
    borderRadius: radius.round,
    backgroundColor: colors.border,
  },
  barraActiva: {
    backgroundColor: colors.primary,
  },
  pasoTexto: {
    ...typography.caption,
  },
  opciones: {
    gap: spacing.md,
  },
  tipoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    minHeight: 104,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderColor: colors.border,
    ...shadow.sm,
  },
  tipoIcono: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoTextos: {
    flex: 1,
    gap: 2,
  },
  tipoTitulo: {
    ...typography.title,
  },
  tipoTexto: {
    ...typography.body,
    color: colors.textSecondary,
  },
  explorar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  explorarTextos: {
    flex: 1,
  },
  explorarTitulo: {
    ...typography.bodyStrong,
    color: colors.primary,
  },
  explorarTexto: {
    ...typography.caption,
  },
  historial: {
    gap: spacing.sm,
  },
  historialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    minHeight: 56,
    padding: spacing.md - 4,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.sm,
  },
  historialIcono: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historialTexto: {
    flex: 1,
    ...typography.bodyStrong,
  },
  resumen: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  errorBarrios: {
    gap: spacing.sm,
  },
  ayuda: {
    ...typography.caption,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  botonAtras: {
    flex: 1,
  },
  botonSiguiente: {
    flex: 2,
  },
});
