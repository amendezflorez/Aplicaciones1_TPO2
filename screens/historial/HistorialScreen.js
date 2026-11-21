import { useCallback, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/Button';
import CasoHistorialCard from '../../components/CasoHistorialCard';
import Chip from '../../components/Chip';
import RangoFechaPicker from '../../components/RangoFechaPicker';
import Screen from '../../components/Screen';
import SegmentedTabs from '../../components/SegmentedTabs';
import { CardSkeleton, EmptyState, ErrorState, InlineMessage } from '../../components/StateViews';
import { RANGOS_FECHA } from '../../config/constants';
import { colors, radius, spacing, typography } from '../../config/theme';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../services/errors';
import { getHistorial } from '../../services/historialService';
import { formatFecha } from '../../utils/publicacionFormatters';
import ValorarModal from './ValorarModal';

const DIA_MS = 24 * 60 * 60 * 1000;
const SIN_FILTRO = { rango: null, desde: null, hasta: null };

const inicioDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 0, 0, 0, 0);
const finDelDia = (fecha) => new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate(), 23, 59, 59, 999);

// Convierte el filtro de fechas elegido en los params `desde` / `hasta` (ISO) del backend.
// Los presets se calculan al momento de pedir (no al elegirlos) para que "Hoy" o "Última
// semana" sigan siendo correctos si la pantalla queda abierta.
function paramsDeFecha({ rango, desde, hasta }) {
  const ahora = new Date();
  switch (rango) {
    case 'hoy':
      return { desde: inicioDelDia(ahora).toISOString(), hasta: ahora.toISOString() };
    case '3dias':
      return { desde: new Date(ahora.getTime() - 3 * DIA_MS).toISOString(), hasta: ahora.toISOString() };
    case 'semana':
      return { desde: new Date(ahora.getTime() - 7 * DIA_MS).toISOString(), hasta: ahora.toISOString() };
    case 'personalizado':
      return { desde: inicioDelDia(desde).toISOString(), hasta: finDelDia(hasta).toISOString() };
    default:
      return {};
  }
}

function etiquetaFiltro({ rango, desde, hasta }) {
  if (rango === 'personalizado' && desde && hasta) {
    return `${formatFecha(desde.toISOString(), { conAnio: true })} – ${formatFecha(hasta.toISOString(), { conAnio: true })}`;
  }
  return RANGOS_FECHA.find((r) => r.id === rango)?.label ?? 'Cualquier fecha';
}

export default function HistorialScreen({ navigation }) {
  const { sinConexion } = useConnectivity();
  const toast = useToast();
  const [segmento, setSegmento] = useState('devolvi'); // 'devolvi' | 'recupere'
  const [filtro, setFiltro] = useState(SIN_FILTRO);
  const [filtroVisible, setFiltroVisible] = useState(false);
  const [estado, setEstado] = useState({ casos: [], loading: true, error: '' });
  const [refreshing, setRefreshing] = useState(false);
  const [casoAValorar, setCasoAValorar] = useState(null);
  // false = los datos en pantalla no corresponden al filtro actual (mostrar esqueleto)
  const cargadoRef = useRef(false);

  // Se piden TODOS los casos del período (sin `tipo`) y se separan acá: así los contadores
  // de "Devolví" y "Recuperé" no dependen de la pestaña elegida.
  const cargar = useCallback(async () => {
    const silencioso = cargadoRef.current;
    if (!silencioso) setEstado((s) => ({ ...s, loading: true, error: '' }));
    try {
      const casos = await getHistorial(paramsDeFecha(filtro));
      cargadoRef.current = true;
      setEstado({ casos: casos ?? [], loading: false, error: '' });
    } catch (e) {
      const mensaje = getErrorMessage(e);
      if (silencioso) {
        // Ya hay datos en pantalla: se conservan y se avisa el fallo.
        toast.error(mensaje);
      } else {
        setEstado({ casos: [], loading: false, error: mensaje });
      }
    }
  }, [filtro, toast]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await cargar();
    setRefreshing(false);
  };

  const aplicarFiltro = (nuevo) => {
    cargadoRef.current = false; // fuerza esqueleto al cambiar de período
    setFiltro(nuevo);
    setFiltroVisible(false);
  };

  const irAlPerfil = (userId) => navigation.navigate('PublicProfile', { userId });

  const handleValorado = (actualizado) =>
    setEstado((s) => ({ ...s, casos: s.casos.map((c) => (c.id === actualizado.id ? actualizado : c)) }));

  const devolvi = estado.casos.filter((c) => c.tipo === 'devolvi');
  const recupere = estado.casos.filter((c) => c.tipo === 'recupere');
  const visibles = segmento === 'devolvi' ? devolvi : recupere;
  const hayFiltro = filtro.rango !== null;
  const pendientes = (lista) => lista.filter((c) => c.puedeValorar).length;

  const opciones = [
    { id: 'devolvi', label: 'Devolví', count: devolvi.length, badge: pendientes(devolvi) },
    { id: 'recupere', label: 'Recuperé', count: recupere.length, badge: pendientes(recupere) },
  ];

  let contenido;
  if (estado.loading) {
    contenido = <CardSkeleton count={3} />;
  } else if (estado.error) {
    contenido = <ErrorState title="No pudimos cargar tu historial" message={estado.error} onRetry={cargar} />;
  } else {
    contenido = (
      <FlatList
        data={visibles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.lista}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        renderItem={({ item }) => (
          <CasoHistorialCard caso={item} onValorar={setCasoAValorar} onVerPerfil={irAlPerfil} sinConexion={sinConexion} />
        )}
        ListEmptyComponent={
          hayFiltro ? (
            <EmptyState
              icon="calendar-outline"
              title="No hay casos en ese período"
              message="Probá con otro rango de fechas para ver más casos."
              actionLabel="Quitar filtro de fechas"
              onAction={() => aplicarFiltro(SIN_FILTRO)}
            />
          ) : segmento === 'devolvi' ? (
            <EmptyState
              icon="hand-left-outline"
              title="Todavía no devolviste objetos"
              message="Cuando le entregues a su dueño un objeto que encontraste y se confirme la devolución, el caso aparece acá."
            />
          ) : (
            <EmptyState
              icon="checkmark-circle-outline"
              title="Todavía no recuperaste objetos"
              message="Cuando un vecino te devuelva algo que perdiste y se confirme la entrega, el caso aparece acá."
            />
          )
        }
      />
    );
  }

  return (
    <Screen scroll={false} style={styles.screen}>
      <SegmentedTabs options={opciones} value={segmento} onChange={setSegmento} />

      <View style={styles.filtros}>
        <Chip
          label={hayFiltro ? etiquetaFiltro(filtro) : 'Filtrar por fecha'}
          icon="calendar-outline"
          selected={hayFiltro}
          onPress={() => setFiltroVisible(true)}
        />
        {hayFiltro ? (
          <Chip label="Quitar" icon="close" onPress={() => aplicarFiltro(SIN_FILTRO)} />
        ) : null}
      </View>

      {contenido}

      <FiltroFechaModal
        visible={filtroVisible}
        filtro={filtro}
        onClose={() => setFiltroVisible(false)}
        onAplicar={aplicarFiltro}
      />
      <ValorarModal
        visible={!!casoAValorar}
        caso={casoAValorar}
        onClose={() => setCasoAValorar(null)}
        onValorado={handleValorado}
      />
    </Screen>
  );
}

// Hoja inferior con los presets y el rango personalizado (RangoFechaPicker compartido).
function FiltroFechaModal({ visible, filtro, onClose, onAplicar }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* Se monta al abrir: el borrador arranca siempre con el filtro vigente. */}
      {visible ? <FiltroFechaContenido filtro={filtro} onClose={onClose} onAplicar={onAplicar} /> : null}
    </Modal>
  );
}

function FiltroFechaContenido({ filtro, onClose, onAplicar }) {
  const [rango, setRango] = useState(filtro.rango);
  const [desde, setDesde] = useState(filtro.desde);
  const [hasta, setHasta] = useState(filtro.hasta);
  const [error, setError] = useState('');

  const aplicar = () => {
    if (rango === 'personalizado') {
      if (!desde || !hasta) {
        setError('Elegí la fecha de inicio y la de fin.');
        return;
      }
      if (desde.getTime() > hasta.getTime()) {
        setError('La fecha de inicio no puede ser posterior a la de fin.');
        return;
      }
    }
    onAplicar({ rango, desde: rango === 'personalizado' ? desde : null, hasta: rango === 'personalizado' ? hasta : null });
  };

  return (
    <View style={styles.overlay}>
        <Pressable style={styles.fondo} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitulo}>Filtrar por fecha</Text>
          <Text style={styles.sheetSub}>Mostramos los casos resueltos dentro del período.</Text>
          <RangoFechaPicker
            rango={rango}
            onSelectRango={(r) => {
              setRango(r);
              setError('');
            }}
            desde={desde}
            hasta={hasta}
            onChangeDesde={(d) => {
              setDesde(d);
              setError('');
            }}
            onChangeHasta={(d) => {
              setHasta(d);
              setError('');
            }}
          />
          <InlineMessage tone="error" message={error} />
          <View style={styles.sheetFooter}>
            <Button
              title="Sin filtro"
              variant="secondary"
              onPress={() => onAplicar(SIN_FILTRO)}
              style={styles.sheetBtn}
            />
            <Button title="Aplicar" onPress={aplicar} style={styles.sheetBtn} />
          </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingBottom: 0,
  },
  filtros: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  lista: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colors.overlay,
  },
  fondo: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  sheetTitulo: {
    ...typography.title,
  },
  sheetSub: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: -spacing.sm,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sheetBtn: {
    flex: 1,
  },
});
