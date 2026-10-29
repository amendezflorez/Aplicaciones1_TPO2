import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BarrioOUbicacionPicker from '../../components/BarrioOUbicacionPicker';
import Button from '../../components/Button';
import CategoriaPicker from '../../components/CategoriaPicker';
import ErrorText from '../../components/ErrorText';
import RangoFechaPicker from '../../components/RangoFechaPicker';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { CATEGORIAS } from '../../config/constants';
import { colors, spacing } from '../../config/theme';
import { useSearchHistory } from '../../hooks/useSearchHistory';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import { getErrorMessage } from '../../services/errors';
import { getBarrios } from '../../services/userService';

const PASOS = ['¿Qué te pasó?', '¿Qué es?', '¿Dónde?', '¿Cuándo?'];

// Wizard de 4 pasos (sección 4.1 del plan). useState local nomás: no hace falta Context,
// la navegación entre pasos es intra-pantalla, mismo espíritu que EditProfileScreen.
export default function BuscadorInicialScreen({ navigation }) {
  const [step, setStep] = useState(0);
  const [tipoBuscado, setTipoBuscado] = useState(null);
  const [categoria, setCategoria] = useState(null);
  const [texto, setTexto] = useState('');
  const [barrioId, setBarrioId] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [rango, setRango] = useState(null);
  const [desde, setDesde] = useState(null);
  const [hasta, setHasta] = useState(null);
  const [error, setError] = useState('');

  const { ubicacion, cargando: cargandoUbicacion, permisoDenegado, obtenerUbicacion } = useUbicacionActual();
  const { ultimasBusquedas, guardarBusqueda } = useSearchHistory();

  useEffect(() => {
    getBarrios()
      .then(setBarrios)
      .catch((e) => setError(getErrorMessage(e)));
  }, []);

  const elegirTipo = (valor) => {
    setTipoBuscado(valor);
    setStep(1);
  };

  const usarUbicacion = async () => {
    const coords = await obtenerUbicacion();
    if (coords) setBarrioId(null);
  };

  const seleccionarBarrio = (barrio) => {
    setBarrioId(barrio.id);
  };

  const construirFiltros = () => ({
    tipoBuscado,
    categoria: categoria ?? undefined,
    texto: texto.trim() || undefined,
    barrioId: ubicacion ? undefined : (barrioId ?? undefined),
    lat: ubicacion?.lat,
    lng: ubicacion?.lng,
    rango: rango ?? undefined,
    desde: rango === 'personalizado' ? desde?.toISOString() : undefined,
    hasta: rango === 'personalizado' ? hasta?.toISOString() : undefined,
  });

  const etiquetaDe = (filtros) => {
    const categoriaLabel = CATEGORIAS.find((c) => c.id === filtros.categoria)?.label ?? 'cualquier categoría';
    const lugar = filtros.barrioId
      ? (barrios.find((b) => b.id === filtros.barrioId)?.name ?? 'un barrio')
      : filtros.lat != null
        ? 'mi ubicación'
        : 'cualquier lugar';
    return `${filtros.tipoBuscado === 'perdido' ? 'Perdí' : 'Encontré'} · ${categoriaLabel} · ${lugar}`;
  };

  const confirmar = () => {
    if (rango === 'personalizado' && (!desde || !hasta)) {
      setError('Elegí las dos fechas del rango personalizado.');
      return;
    }
    setError('');
    const filtros = construirFiltros();
    guardarBusqueda(filtros, etiquetaDe(filtros));
    navigation.navigate('Resultados', { filtros });
  };

  const repetirBusqueda = (busqueda) => {
    navigation.navigate('Resultados', { filtros: busqueda.filtros });
  };

  return (
    <Screen>
      <Text style={styles.pasoIndicador}>
        Paso {step + 1} de 4 — {PASOS[step]}
      </Text>

      {step === 0 ? (
        <View style={styles.opciones}>
          <TouchableOpacity style={styles.opcionGrande} onPress={() => elegirTipo('perdido')}>
            <Text style={styles.opcionEmoji}>😟</Text>
            <Text style={styles.opcionTexto}>Perdí algo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opcionGrande} onPress={() => elegirTipo('encontrado')}>
            <Text style={styles.opcionEmoji}>🔎</Text>
            <Text style={styles.opcionTexto}>Encontré algo</Text>
          </TouchableOpacity>

          {ultimasBusquedas.length > 0 ? (
            <View style={styles.historial}>
              <Text style={styles.historialTitulo}>Últimas búsquedas</Text>
              {ultimasBusquedas.map((b, i) => (
                <TouchableOpacity key={i} style={styles.historialItem} onPress={() => repetirBusqueda(b)}>
                  <Text style={styles.historialTexto}>{b.etiqueta}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {step === 1 ? (
        <View style={styles.paso}>
          <CategoriaPicker selected={categoria} onSelect={setCategoria} />
          <TextField
            label="Palabras clave (opcional)"
            placeholder="Ej: llavero, mochila azul…"
            value={texto}
            onChangeText={setTexto}
          />
        </View>
      ) : null}

      {step === 2 ? (
        <View style={styles.paso}>
          <BarrioOUbicacionPicker
            barrios={barrios}
            barrioId={barrioId}
            onSelectBarrio={seleccionarBarrio}
            ubicacion={ubicacion}
            cargandoUbicacion={cargandoUbicacion}
            permisoDenegado={permisoDenegado}
            onUsarUbicacion={usarUbicacion}
            onQuitarUbicacion={() => {}}
          />
        </View>
      ) : null}

      {step === 3 ? (
        <View style={styles.paso}>
          <RangoFechaPicker
            rango={rango}
            onSelectRango={setRango}
            desde={desde}
            hasta={hasta}
            onChangeDesde={setDesde}
            onChangeHasta={setHasta}
          />
        </View>
      ) : null}

      <ErrorText message={error} />

      <View style={styles.botones}>
        {step > 0 ? <Button title="Atrás" variant="secondary" onPress={() => setStep(step - 1)} /> : null}
        {step > 0 && step < 3 ? <Button title="Siguiente" onPress={() => setStep(step + 1)} /> : null}
        {step === 3 ? <Button title="Buscar" onPress={confirmar} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pasoIndicador: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  opciones: {
    gap: spacing.md,
  },
  opcionGrande: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  opcionEmoji: {
    fontSize: 40,
  },
  opcionTexto: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  historial: {
    gap: spacing.xs,
  },
  historialTitulo: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  historialItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 10,
  },
  historialTexto: {
    fontSize: 14,
    color: colors.text,
  },
  paso: {
    gap: spacing.md,
  },
  botones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
