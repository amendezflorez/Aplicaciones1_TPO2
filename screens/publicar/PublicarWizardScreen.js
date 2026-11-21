import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import BarrioPicker from '../../components/BarrioPicker';
import Button from '../../components/Button';
import Card from '../../components/Card';
import FechaHoraField from '../../components/FechaHoraField';
import Loading from '../../components/Loading';
import PermisoDenegado from '../../components/PermisoDenegado';
import Screen from '../../components/Screen';
import { InlineMessage } from '../../components/StateViews';
import TextField from '../../components/TextField';
import TipoBadge from '../../components/TipoBadge';
import { CATEGORIAS, FRANJAS_HORARIAS, MAX_FOTOS_PUBLICACION } from '../../config/constants';
import { colors, radius, shadow, spacing, typography } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
import { useToast } from '../../hooks/useToast';
import { useUbicacionActual } from '../../hooks/useUbicacionActual';
import {
  borrarBorrador,
  borrarRegistroBorrador,
  cargarBorrador,
  copiarFotoAlBorrador,
  eliminarArchivoBorrador,
  existeArchivo,
  guardarBorrador,
  restaurarFotosDelBorrador,
} from '../../services/borradorPublicacionStorage';
import { esErrorDeRed, getErrorMessage } from '../../services/errors';
import { agregarACola, obtenerItem } from '../../services/offline/colaPendientes';
import { enviarPublicacion, FOTO_FALTANTE } from '../../services/publicarPublicacion';
import { getBarrios } from '../../services/userService';
import { conTimeout } from '../../utils/promesaConTimeout';
import {
  formatCoordenadas,
  formatDireccionGeocodificada,
  formatFecha,
} from '../../utils/publicacionFormatters';
import { generarIdLocal } from '../../utils/uuid';

const PICKER_OPTIONS_FOTO = { mediaTypes: ['images'], quality: 0.7 };
// ~8s: igual criterio que useUbicacionActual para getCurrentPositionAsync — geocodeAsync
// usa el mismo tipo de proveedor del sistema y puede quedar colgado en el mismo emulador
// sin Google Play Services.
const TIMEOUT_GEOCODING_MS = 8000;
// Largos máximos: los mismos que valida el backend (PublicacionService.crear), que a su vez
// respetan el tamaño de las columnas en la base. Sin esto, un texto largo llegaba a la base
// y el backend respondía 500 en vez de un error claro.
const MAX_LARGO = {
  titulo: 120,
  descripcion: 2000,
  direccionExacta: 255,
  preguntaVerificacion: 200,
  respuestaVerificacion: 100,
};

// Título grande + ayuda de cada paso (encabezado de <Screen>).
const TEXTOS_PASO = {
  tipo: { titulo: '¿Qué querés publicar?', ayuda: 'Elegí una opción para empezar. Son pocos pasos.' },
  fotos: { titulo: 'Sumá fotos', ayuda: `Una buena foto ayuda a reconocerlo. Hasta ${MAX_FOTOS_PUBLICACION} fotos.` },
  detalles: { titulo: 'Contanos los detalles', ayuda: 'Cuanto más claro, más fácil de encontrar.' },
  ubicacion: { titulo: '¿Dónde fue?', ayuda: 'Elegí el barrio y sumá la dirección o tu ubicación actual.' },
  verificacion: {
    titulo: 'Pregunta de verificación',
    ayuda: 'Para entregarlo a su verdadero dueño.',
  },
  resumen: { titulo: 'Revisá y publicá', ayuda: 'Chequeá que esté todo bien antes de publicar.' },
};

const ICONOS_CATEGORIA = {
  documentos: 'document-text-outline',
  llaves: 'key-outline',
  electronica: 'phone-portrait-outline',
  mascotas: 'paw-outline',
  ropa: 'shirt-outline',
  otros: 'apps-outline',
};

// El buscador usa 'perdido'/'encontrado'; por las dudas también se aceptan los valores
// cortos viejos ('perdi'/'encontre').
const normalizarTipo = (valor) => {
  if (valor === 'perdido' || valor === 'perdi') return 'perdido';
  if (valor === 'encontrado' || valor === 'encontre') return 'encontrado';
  return null;
};

// La franja horaria se deriva de la hora del suceso (el backend la guarda aparte).
function franjaDesdeHora(fecha) {
  const h = fecha.getHours();
  if (h >= 6 && h < 12) return 'mañana';
  if (h >= 12 && h < 20) return 'tarde';
  return 'noche';
}

// Lista de pasos según el tipo: "Verificación" solo existe si tipo=encontrado (la
// pregunta/respuesta están prohibidas para tipo=perdido en el backend). Fuera del
// componente para poder usarla también al restaurar un borrador, antes de que el estado de
// React tenga los datos cargados.
const pasosPara = (tipo) => {
  const base = ['tipo', 'fotos', 'detalles', 'ubicacion'];
  if (tipo === 'encontrado') base.push('verificacion');
  base.push('resumen');
  return base;
};

// Validación pura de un paso a partir de los datos (no del estado de React): la usa el
// botón "Siguiente" y la restauración del borrador (para no dejar a la persona en un paso
// posterior a uno que quedó incompleto, p. ej. si se perdió una foto).
function erroresDe(p, d) {
  const found = {};
  if (p === 'tipo' && !d.tipo) {
    found.tipo = 'Elegí qué querés publicar.';
  }
  if (p === 'fotos' && d.fotos.length === 0) {
    found.fotos = 'Agregá al menos una foto.';
  }
  if (p === 'detalles') {
    if (!d.titulo.trim()) found.titulo = 'Escribí un título.';
    if (!d.descripcion.trim()) found.descripcion = 'Escribí una descripción.';
    if (!d.categoria) found.categoria = 'Elegí una categoría.';
    if (d.fechaSuceso > new Date()) found.fecha = 'La fecha y hora no pueden ser futuras.';
  }
  if (p === 'ubicacion') {
    if (!d.barrioId) found.barrio = 'Elegí el barrio.';
    // "ya sea escribiéndola o tomando la ubicación actual" (consigna): alcanza con una.
    const tieneDireccion = Boolean(d.direccionExacta.trim());
    const tieneCoordenadas = d.latExacta != null && d.lngExacta != null;
    if (!tieneDireccion && !tieneCoordenadas) {
      found.ubicacion = 'Escribí la dirección exacta o usá tu ubicación actual.';
    }
  }
  if (p === 'verificacion') {
    if (!d.preguntaVerificacion.trim()) found.pregunta = 'Escribí una pregunta de verificación.';
    if (!d.respuestaVerificacion.trim()) found.respuesta = 'Escribí la respuesta correcta.';
  }
  return found;
}

// Índice del paso donde retomar un borrador: el paso guardado (por NOMBRE y no por número,
// porque la cantidad de pasos cambia según el tipo), salvo que un paso anterior haya
// quedado incompleto — ahí se frena en el primero incompleto. Un borrador viejo o con un
// paso que ya no existe para ese tipo cae en el primer paso incompleto: nunca rompe.
function indiceParaRetomar(pasoGuardado, datos) {
  const pasos = pasosPara(datos.tipo);
  const primerIncompleto = pasos.findIndex((p) => Object.keys(erroresDe(p, datos)).length > 0);
  const tope = primerIncompleto === -1 ? pasos.length - 1 : primerIncompleto;
  const guardado = pasos.indexOf(pasoGuardado);
  return guardado === -1 ? tope : Math.min(guardado, tope);
}

// Wizard de carga guiada del Punto 5. Una sola pantalla con pasos internos vía useState:
// todo el estado tiene que viajar junto a cada autoguardado del borrador. El paso
// "Verificación" solo existe si tipo=encontrado (la pregunta/respuesta están prohibidas
// para tipo=perdido en el backend), así que la lista de pasos se arma dinámicamente.
export default function PublicarWizardScreen({ route, navigation }) {
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const toast = useToast();
  const {
    cargando: cargandoUbicacion,
    error: errorUbicacion,
    obtenerUbicacion,
    abrirConfiguracion,
  } = useUbicacionActual();

  const [listo, setListo] = useState(false); // true recién cuando se resolvió si había borrador
  const [borradorPendiente, setBorradorPendiente] = useState(null);
  const [indice, setIndice] = useState(0);
  const [errores, setErrores] = useState({});

  const [tipo, setTipo] = useState(null);
  const [fotos, setFotos] = useState([]); // [{ uri, url }], url null hasta subirla
  const [copiandoFoto, setCopiandoFoto] = useState(false);
  const [camaraDenegada, setCamaraDenegada] = useState(null); // null | { puedePreguntar }
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [fechaSuceso, setFechaSuceso] = useState(new Date());
  const [barrioId, setBarrioId] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [errorBarrios, setErrorBarrios] = useState('');
  const [direccionExacta, setDireccionExacta] = useState('');
  const [latExacta, setLatExacta] = useState(null);
  const [lngExacta, setLngExacta] = useState(null);
  const [preguntaVerificacion, setPreguntaVerificacion] = useState('');
  const [respuestaVerificacion, setRespuestaVerificacion] = useState('');
  const [clientRequestId, setClientRequestId] = useState(null);

  const [publicando, setPublicando] = useState(false);
  // true una vez publicada o encolada: el autoguardado (debounce de 600ms) no debe volver a
  // escribir el borrador después — si no, reaparece como "borrador sin terminar" con el
  // mismo clientRequestId del ítem encolado, y descartarlo borraría sus fotos.
  const terminadoRef = useRef(false);
  const enviandoRef = useRef(false); // candado contra doble envío, ver publicar()
  const [errorEnvio, setErrorEnvio] = useState('');

  const pasos = useMemo(() => pasosPara(tipo), [tipo]);
  const paso = pasos[Math.min(indice, pasos.length - 1)];
  const franjaHoraria = franjaDesdeHora(fechaSuceso);

  const cargarBarrios = useCallback(() => {
    setErrorBarrios('');
    getBarrios()
      .then(setBarrios)
      // No se finge una lista vacía: se avisa y se ofrece reintentar.
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  }, []);

  useEffect(() => {
    getBarrios()
      .then(setBarrios)
      .catch((e) => setErrorBarrios(getErrorMessage(e)));
  }, []);

  // Estado inicial limpio (también se usa después de publicar). Genera un clientRequestId
  // NUEVO: reusar el anterior haría que el backend devuelva la publicación ya creada en vez
  // de crear una nueva.
  const resetear = (params = {}) => {
    const tipoInicial = normalizarTipo(params.tipo);
    setTipo(tipoInicial);
    setFotos([]);
    setTitulo('');
    setDescripcion('');
    setCategoria(params.categoria ?? null);
    setFechaSuceso(new Date());
    setBarrioId(params.barrioId ?? null);
    setDireccionExacta('');
    setLatExacta(null);
    setLngExacta(null);
    setPreguntaVerificacion('');
    setRespuestaVerificacion('');
    setErrores({});
    setErrorEnvio('');
    setCamaraDenegada(null);
    setClientRequestId(generarIdLocal());
    // Si llega el tipo por params (p. ej. desde "sin resultados" del buscador) ya se
    // elegió el primer paso: saltar al siguiente.
    setIndice(tipoInicial ? 1 : 0);
    terminadoRef.current = false;
  };

  // Restaura TODO el estado del borrador, incluido el paso donde había quedado, y vuelve a
  // chequear las fotos: si el sistema limpió alguna del dispositivo, se avisa en vez de
  // fallar recién al publicar.
  const restaurarBorrador = async (guardado) => {
    try {
      // Reusa el mismo clientRequestId del borrador: si ese intento ya había llegado a
      // crear la publicación en el backend pero la respuesta no volvió, publicar de nuevo
      // con el mismo id no duplica.
      const idRestaurado = guardado.clientRequestId ?? generarIdLocal();
      const { fotos: fotosRestauradas, perdidas } = await restaurarFotosDelBorrador(guardado.fotos, idRestaurado);
      const fecha = guardado.fechaSuceso ? new Date(guardado.fechaSuceso) : new Date();
      const datos = {
        tipo: guardado.tipo ?? null,
        fotos: fotosRestauradas,
        titulo: guardado.titulo ?? '',
        descripcion: guardado.descripcion ?? '',
        categoria: guardado.categoria ?? null,
        // Una fecha corrupta en el JSON daría "Invalid Date" y rompería toISOString().
        fechaSuceso: Number.isNaN(fecha.getTime()) ? new Date() : fecha,
        barrioId: guardado.barrioId ?? null,
        direccionExacta: guardado.direccionExacta ?? '',
        latExacta: guardado.latExacta ?? null,
        lngExacta: guardado.lngExacta ?? null,
        preguntaVerificacion: guardado.preguntaVerificacion ?? '',
        respuestaVerificacion: guardado.respuestaVerificacion ?? '',
      };
      setTipo(datos.tipo);
      setFotos(datos.fotos);
      setTitulo(datos.titulo);
      setDescripcion(datos.descripcion);
      setCategoria(datos.categoria);
      setFechaSuceso(datos.fechaSuceso);
      setBarrioId(datos.barrioId);
      setDireccionExacta(datos.direccionExacta);
      setLatExacta(datos.latExacta);
      setLngExacta(datos.lngExacta);
      setPreguntaVerificacion(datos.preguntaVerificacion);
      setRespuestaVerificacion(datos.respuestaVerificacion);
      setClientRequestId(idRestaurado);
      setErrores({});
      setErrorEnvio('');
      terminadoRef.current = false;
      // Borradores viejos guardaron el número de paso y no el nombre.
      const pasoGuardado = guardado.paso ?? pasosPara(datos.tipo)[guardado.indice ?? 0];
      setIndice(indiceParaRetomar(pasoGuardado, datos));
      if (perdidas > 0) {
        toast.error(
          perdidas === 1
            ? 'Una de las fotos del borrador ya no está en el dispositivo. Volvé a agregarla.'
            : `${perdidas} fotos del borrador ya no están en el dispositivo. Volvé a agregarlas.`,
          6000
        );
      }
    } catch (e) {
      // Nunca dejar la pantalla colgada: si algo del borrador no se pudo restaurar, se
      // arranca de cero con el prefill.
      console.warn('No se pudo restaurar el borrador', e);
      resetear(route.params ?? {});
    }
  };

  // Al entrar: si hay un borrador guardado de este usuario, se ofrece retomarlo o
  // descartarlo (tarjeta en pantalla) antes de mostrar el wizard.
  useEffect(() => {
    let vigente = true;
    cargarBorrador(user.id).then(async (guardado) => {
      if (!vigente) return;
      // "Editar" desde Mis publicaciones (ítem de la cola con error) llega con retomar:true:
      // la persona ya eligió editar esa publicación, así que se abre directo en vez de
      // preguntarle "¿Retomar o descartar?" (Descartar ahí era confuso).
      if (guardado && route.params?.retomar) {
        navigation.setParams({ retomar: undefined });
        await restaurarBorrador(guardado);
        if (vigente) setListo(true);
        return;
      }
      if (guardado) {
        setBorradorPendiente(guardado);
      } else {
        resetear(route.params ?? {});
      }
      setListo(true);
    });
    return () => {
      vigente = false;
    };
    // Solo al montar: route.params es el prefill inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retomarBorrador = async () => {
    const guardado = borradorPendiente;
    setBorradorPendiente(null);
    await restaurarBorrador(guardado);
  };

  const descartarBorrador = async () => {
    const guardado = borradorPendiente;
    setBorradorPendiente(null);
    // Si ese id ya está en la cola offline, sus fotos son las del ítem pendiente: solo se
    // borra el registro, nunca la carpeta.
    if (await obtenerItem(user.id, guardado.clientRequestId)) {
      await borrarRegistroBorrador(user.id);
    } else {
      await borrarBorrador(user.id, guardado.clientRequestId);
    }
    resetear(route.params ?? {});
    toast.info('Borrador descartado.');
  };

  const construirBorrador = () => ({
    // Por nombre ('detalles', 'ubicacion'...), no por número: la cantidad de pasos cambia
    // según el tipo (ver pasosPara), así que el índice solo no alcanza para ubicarse.
    paso,
    tipo,
    fotos,
    titulo: titulo.trim(),
    descripcion: descripcion.trim(),
    categoria,
    fechaSuceso: fechaSuceso.toISOString(),
    franjaHoraria,
    barrioId,
    direccionExacta: direccionExacta.trim(),
    latExacta,
    lngExacta,
    preguntaVerificacion: preguntaVerificacion.trim(),
    respuestaVerificacion: respuestaVerificacion.trim(),
    clientRequestId,
  });

  // Autoguardado con debounce: persiste el borrador 600ms después del último cambio, no
  // en cada tecla. No corre hasta que `listo` y se resolvió el borrador previo, para no
  // pisarlo con el estado vacío mientras todavía se pregunta; y no guarda un borrador
  // vacío (si no, siempre aparecería "tenés un borrador" al volver).
  const hayContenido = Boolean(tipo || fotos.length || titulo || descripcion || categoria || barrioId || direccionExacta);
  // guardarAhoraRef siempre apunta a una función con el estado del ÚLTIMO render, para
  // poder llamarla desde listeners que se registran una sola vez (AppState, desmontaje).
  const guardarAhoraRef = useRef(() => {});
  // Efecto sin dependencias = corre después de cada render (React no permite escribir una
  // ref durante el render mismo).
  useEffect(() => {
    guardarAhoraRef.current = () => {
      if (!listo || borradorPendiente || terminadoRef.current || !clientRequestId || !hayContenido) return;
      guardarBorrador(user.id, { ...construirBorrador(), indice });
    };
  });

  useEffect(() => {
    if (!listo || borradorPendiente || !hayContenido) return undefined;
    const id = setTimeout(() => guardarAhoraRef.current(), 600);
    return () => clearTimeout(id);
  }, [
    listo,
    borradorPendiente,
    hayContenido,
    indice,
    paso, // cambiar de paso también es progreso a guardar
    tipo,
    fotos,
    titulo,
    descripcion,
    categoria,
    fechaSuceso,
    barrioId,
    direccionExacta,
    latExacta,
    lngExacta,
    preguntaVerificacion,
    respuestaVerificacion,
  ]);

  // Sin esperar el debounce: al mandar la app a segundo plano (el sistema puede matarla ahí
  // mismo) y al salir de la pantalla, se guarda en el acto para no perder los últimos 600 ms.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') guardarAhoraRef.current();
    });
    return () => {
      sub.remove();
      guardarAhoraRef.current();
    };
  }, []);

  // Botón "atrás" de Android y flecha del header: como los pasos son estado interno de UNA
  // pantalla y no pantallas del stack, por defecto salían del wizard entero. Ahora
  // retroceden un paso; recién en el primer paso salen (el borrador queda guardado). No
  // intercepta la salida después de publicar/encolar (navigate no es GO_BACK/POP).
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (terminadoRef.current || indice === 0 || borradorPendiente) return;
        const accion = e.data.action.type;
        if (accion !== 'GO_BACK' && accion !== 'POP') return;
        e.preventDefault();
        setErrores({});
        setIndice((actual) => Math.max(0, actual - 1));
      }),
    [navigation, indice, borradorPendiente]
  );

  const usarUbicacion = async () => {
    const coords = await obtenerUbicacion();
    if (!coords) return;
    setLatExacta(coords.lat);
    setLngExacta(coords.lng);
    setErrores((e) => ({ ...e, ubicacion: undefined }));
    toast.success('Ubicación cargada.');
    // Sugerencia editable de dirección: solo si la persona todavía no escribió nada. Si el
    // reverse geocoding falla NO es un error: ya alcanza con tener coordenadas.
    if (!direccionExacta.trim()) {
      try {
        const [direccion] = await conTimeout(
          Location.reverseGeocodeAsync({ latitude: coords.lat, longitude: coords.lng }),
          TIMEOUT_GEOCODING_MS
        );
        const sugerida = formatDireccionGeocodificada(direccion);
        if (sugerida) setDireccionExacta(sugerida);
      } catch (e) {
        console.warn('No se pudo sugerir una dirección a partir de la ubicación', e);
      }
    }
  };

  const quitarUbicacion = () => {
    setLatExacta(null);
    setLngExacta(null);
  };

  // Mejor esfuerzo: si la persona solo escribió la dirección (sin GPS), intenta resolver
  // coordenadas a partir de ese texto, en segundo plano. Si falla, el alta igual funciona
  // (el backend usa el centro del barrio como respaldo para el mapa).
  const intentarGeocodificarDireccion = async (texto) => {
    if (sinConexion) return;
    try {
      const { granted } = await Location.getForegroundPermissionsAsync();
      if (!granted) return;
    } catch {
      return;
    }
    try {
      const [primero] = await conTimeout(Location.geocodeAsync(texto), TIMEOUT_GEOCODING_MS);
      if (!primero) return;
      // "??": si mientras tanto la persona ya consiguió coordenadas reales, no se pisan.
      setLatExacta((actual) => actual ?? primero.latitude);
      setLngExacta((actual) => actual ?? primero.longitude);
    } catch (e) {
      console.warn('No se pudieron geocodificar las coordenadas de la dirección escrita', e);
    }
  };

  const agregarFotos = async (assets) => {
    setCopiandoFoto(true);
    try {
      for (const asset of assets) {
        const uriPersistida = await copiarFotoAlBorrador(asset.uri, clientRequestId);
        setFotos((actuales) => [...actuales, { uri: uriPersistida, url: null }]);
      }
      setErrores((e) => ({ ...e, fotos: undefined }));
    } catch {
      toast.error('No pudimos guardar la foto. Probá de nuevo.');
    } finally {
      setCopiandoFoto(false);
    }
  };

  const elegirDeGaleria = async () => {
    const restantes = MAX_FOTOS_PUBLICACION - fotos.length;
    if (restantes <= 0) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        ...PICKER_OPTIONS_FOTO,
        allowsMultipleSelection: true,
        selectionLimit: restantes,
      });
      if (!result.canceled) await agregarFotos((result.assets ?? []).slice(0, restantes));
    } catch {
      toast.error('No pudimos abrir la galería.');
    }
  };

  const tomarFoto = async () => {
    if (fotos.length >= MAX_FOTOS_PUBLICACION) return;
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        setCamaraDenegada({ puedePreguntar: permiso.canAskAgain !== false });
        return;
      }
      setCamaraDenegada(null);
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS_FOTO);
      if (!result.canceled) await agregarFotos(result.assets ?? []);
    } catch {
      toast.error('No pudimos abrir la cámara. Probá con la galería.');
    }
  };

  const moverFoto = (index, delta) => {
    setFotos((actuales) => {
      const destino = index + delta;
      if (destino < 0 || destino >= actuales.length) return actuales;
      const copia = [...actuales];
      [copia[index], copia[destino]] = [copia[destino], copia[index]];
      return copia;
    });
  };

  const eliminarFoto = (index) => {
    setFotos((actuales) => {
      const eliminada = actuales[index];
      if (eliminada) eliminarArchivoBorrador(eliminada.uri);
      return actuales.filter((_, i) => i !== index);
    });
  };

  // Pura (no toca estado): al tocar "Siguiente" decide si avanzar y qué errores mostrar
  // por campo.
  const calcularErrores = (p) =>
    erroresDe(p, {
      tipo,
      fotos,
      titulo,
      descripcion,
      categoria,
      fechaSuceso,
      barrioId,
      direccionExacta,
      latExacta,
      lngExacta,
      preguntaVerificacion,
      respuestaVerificacion,
    });

  const irAlPaso = (nombre) => {
    const i = pasos.indexOf(nombre);
    if (i >= 0) {
      setErrores({});
      setIndice(i);
    }
  };

  const siguiente = () => {
    const found = calcularErrores(paso);
    setErrores(found);
    if (Object.keys(found).length > 0) return;
    // Si se sale de "Ubicación" solo con dirección escrita (sin GPS), intenta resolver
    // coordenadas sin bloquear el avance.
    if (paso === 'ubicacion' && (latExacta == null || lngExacta == null) && direccionExacta.trim()) {
      intentarGeocodificarDireccion(direccionExacta.trim());
    }
    if (paso === 'resumen') {
      publicar();
      return;
    }
    setIndice(indice + 1);
  };

  const atras = () => {
    setErrores({});
    setIndice(Math.max(0, indice - 1));
  };

  // Punto 6: sin conexión (o si el envío falla por red), la publicación se encola en vez
  // de perderse; la cola la procesa services/offline/colaProcesador.js al volver la
  // conexión. construirBorrador() se llama de nuevo acá para capturar el progreso real de
  // `fotos` (onFotoSubida ya lo fue guardando).
  const encolarYSalir = async () => {
    try {
      terminadoRef.current = true;
      await agregarACola(user.id, construirBorrador());
    } catch (e) {
      terminadoRef.current = false;
      setPublicando(false);
      toast.error(getErrorMessage(e));
      return;
    }
    setPublicando(false);
    toast.info('Sin conexión: la guardamos y se publica sola cuando vuelva la conexión.', 5500);
    resetear();
    navigation.navigate('MisPublicaciones');
  };

  const publicar = async () => {
    // Candado sincrónico contra el doble toque: `publicando` es estado de React y recién
    // deshabilita el botón en el próximo render, así que dos toques en el mismo frame
    // arrancaban dos envíos (fotos subidas dos veces y dos POST con el mismo
    // clientRequestId, donde el segundo choca con la restricción única del backend y
    // muestra un error aunque la publicación sí se creó). Una ref cambia en el acto.
    // terminadoRef: ya se publicó o encoló; no se vuelve a mandar desde esta pantalla.
    if (enviandoRef.current || terminadoRef.current) return;
    enviandoRef.current = true;
    try {
      await publicarSinCandado();
    } finally {
      enviandoRef.current = false;
    }
  };

  const publicarSinCandado = async () => {
    setPublicando(true);
    setErrorEnvio('');

    // Ya se sabe que no hay conexión: ni se intenta, para no hacerle esperar a la persona
    // un timeout de red que ya sabemos que va a fallar.
    if (sinConexion) {
      await encolarYSalir();
      return;
    }

    const base = construirBorrador();
    try {
      await enviarPublicacion(base, {
        // Persiste qué fotos ya se subieron antes de seguir con la próxima: si falla a
        // mitad de camino, "Retomar" (o la cola offline) no las vuelve a subir.
        onFotoSubida: (foto, url) => {
          setFotos((actuales) => {
            const siguientes = actuales.map((f) => (f.uri === foto.uri ? { ...f, url } : f));
            if (!terminadoRef.current) guardarBorrador(user.id, { ...base, fotos: siguientes, indice });
            return siguientes;
          });
        },
      });
      terminadoRef.current = true;
      await borrarBorrador(user.id, clientRequestId);
      setPublicando(false);
      toast.success('¡Publicado! Ya aparece en las búsquedas.');
      // Resetea TODO el estado y el clientRequestId: la próxima publicación es otra.
      resetear();
      navigation.navigate('MisPublicaciones');
    } catch (e) {
      // Una foto ya no existe en el dispositivo: se sacan las que faltan y se vuelve al
      // paso de fotos (no es un error de red, encolarla no serviría de nada).
      if (e.code === FOTO_FALTANTE) {
        setFotos((actuales) => actuales.filter((f) => f.url || existeArchivo(f.uri)));
        setIndice(pasos.indexOf('fotos'));
        setPublicando(false);
        toast.error(e.message);
        return;
      }
      // NetInfo pudo no haber avisado todavía (o el backend es inalcanzable): si la
      // request falló sin respuesta, se trata como offline igual.
      if (esErrorDeRed(e)) {
        await encolarYSalir();
        return;
      }
      const mensaje = getErrorMessage(e);
      setErrorEnvio(mensaje);
      toast.error(mensaje);
      setPublicando(false);
    }
  };

  if (!listo) return <Loading />;

  // ---------- Borrador sin terminar ----------
  if (borradorPendiente) {
    const fotoBorrador = borradorPendiente.fotos?.[0]?.uri;
    return (
      <Screen title="Publicar" subtitle="Antes de empezar de nuevo, mirá esto.">
        <Card style={styles.borradorCard}>
          <View style={styles.borradorHeader}>
            <View style={styles.borradorIcono}>
              <Ionicons name="document-text-outline" size={24} color={colors.primary} />
            </View>
            <View style={styles.flex1}>
              <Text style={typography.subheading}>Tenés un borrador sin terminar</Text>
              <Text style={typography.caption}>Lo guardamos para que sigas donde lo dejaste.</Text>
            </View>
          </View>
          <View style={styles.borradorResumen}>
            {fotoBorrador ? <Image source={{ uri: fotoBorrador }} style={styles.borradorFoto} /> : null}
            <View style={styles.flex1}>
              {borradorPendiente.tipo ? <TipoBadge tipo={borradorPendiente.tipo} /> : null}
              <Text style={styles.borradorTitulo} numberOfLines={2}>
                {borradorPendiente.titulo || 'Sin título todavía'}
              </Text>
            </View>
          </View>
          <Button title="Retomar" icon="arrow-forward" onPress={retomarBorrador} />
          <Button title="Descartar" variant="danger" icon="trash-outline" onPress={descartarBorrador} />
        </Card>
      </Screen>
    );
  }

  const categoriaInfo = CATEGORIAS.find((c) => c.id === categoria);
  const barrioLabel = barrios.find((b) => b.id === barrioId)?.name ?? '';
  const franjaLabel = FRANJAS_HORARIAS.find((f) => f.id === franjaHoraria)?.label ?? '';
  const coordenadasTexto = formatCoordenadas(latExacta, lngExacta);
  const textos = TEXTOS_PASO[paso];
  const esUltimo = paso === 'resumen';

  const footer = (
    <View style={styles.footerRow}>
      {indice > 0 ? (
        <Button
          title="Atrás"
          variant="secondary"
          icon="arrow-back"
          onPress={atras}
          disabled={publicando}
          style={styles.footerAtras}
        />
      ) : null}
      <Button
        title={esUltimo ? (sinConexion ? 'Guardar para enviar luego' : 'Publicar') : 'Siguiente'}
        icon={esUltimo ? 'checkmark' : undefined}
        iconRight={esUltimo ? undefined : 'arrow-forward'}
        variant={esUltimo ? 'accent' : 'primary'}
        onPress={siguiente}
        loading={publicando}
        style={styles.flex1}
      />
    </View>
  );

  return (
    <Screen key={paso} title={textos.titulo} subtitle={textos.ayuda} footer={footer}>
      <ProgresoPasos total={pasos.length} actual={indice} />

      {paso === 'tipo' ? (
        <View style={styles.tarjetasTipo}>
          <TarjetaTipo
            icono="help-circle"
            titulo="Perdí algo"
            detalle="Publicalo para que quien lo encontró pueda avisarte."
            color={colors.perdido}
            suave={colors.perdidoSoft}
            seleccionada={tipo === 'perdido'}
            onPress={() => {
              setTipo('perdido');
              setErrores({});
            }}
          />
          <TarjetaTipo
            icono="hand-left"
            titulo="Encontré algo"
            detalle="Ayudá a que vuelva a su dueño de forma simple y segura."
            color={colors.encontrado}
            suave={colors.encontradoSoft}
            seleccionada={tipo === 'encontrado'}
            onPress={() => {
              setTipo('encontrado');
              setErrores({});
            }}
          />
          {errores.tipo ? <MensajeError texto={errores.tipo} /> : null}
        </View>
      ) : null}

      {paso === 'fotos' ? (
        <View style={styles.paso}>
          {fotos.length > 0 ? (
            <View style={styles.grillaFotos}>
              {fotos.map((foto, index) => (
                <View key={foto.uri} style={styles.fotoCelda}>
                  <Image source={{ uri: foto.uri }} style={styles.fotoImg} />
                  {index === 0 ? (
                    <View style={styles.fotoPrincipal}>
                      <Text style={styles.fotoPrincipalTexto}>Principal</Text>
                    </View>
                  ) : (
                    <Pressable
                      style={styles.fotoMover}
                      onPress={() => moverFoto(index, -1)}
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Mover la foto ${index + 1} hacia adelante`}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.white} />
                    </Pressable>
                  )}
                  <Pressable
                    style={styles.fotoQuitar}
                    onPress={() => eliminarFoto(index)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar la foto ${index + 1}`}
                  >
                    <Ionicons name="close" size={16} color={colors.white} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.fotosVacio}>
              <Ionicons name="images-outline" size={40} color={colors.textMuted} />
              <Text style={typography.caption}>Todavía no agregaste fotos</Text>
            </View>
          )}
          <Text style={styles.contador}>
            {fotos.length} de {MAX_FOTOS_PUBLICACION} fotos
            {fotos.length > 1 ? ' · la primera es la principal' : ''}
          </Text>

          {camaraDenegada ? (
            <PermisoDenegado
              titulo="No pudimos usar la cámara"
              motivo="Necesitamos acceso a la cámara para sacar la foto. Podés habilitarlo o elegir una foto de tu galería."
              puedePreguntar={camaraDenegada.puedePreguntar}
              onPedirPermiso={tomarFoto}
              alternativaLabel="Elegir de la galería"
              onAlternativa={elegirDeGaleria}
            />
          ) : null}

          <View style={styles.fotoBotones}>
            <Button
              title="Cámara"
              icon="camera-outline"
              variant="secondary"
              onPress={tomarFoto}
              disabled={fotos.length >= MAX_FOTOS_PUBLICACION}
              loading={copiandoFoto}
              style={styles.flex1}
            />
            <Button
              title="Galería"
              icon="images-outline"
              variant="secondary"
              onPress={elegirDeGaleria}
              disabled={fotos.length >= MAX_FOTOS_PUBLICACION}
              loading={copiandoFoto}
              style={styles.flex1}
            />
          </View>
          {fotos.length >= MAX_FOTOS_PUBLICACION ? (
            <Text style={styles.contador}>Llegaste al máximo de fotos. Quitá alguna para agregar otra.</Text>
          ) : null}
          {errores.fotos ? <MensajeError texto={errores.fotos} /> : null}
        </View>
      ) : null}

      {paso === 'detalles' ? (
        <View style={styles.paso}>
          <TextField
            label="Título"
            placeholder="Ej: Llaves con llavero rojo"
            value={titulo}
            onChangeText={setTitulo}
            maxLength={MAX_LARGO.titulo}
            error={errores.titulo}
            helper={`${titulo.length}/${MAX_LARGO.titulo}`}
            autoCapitalize="sentences"
          />
          <TextField
            label="Descripción"
            placeholder="Contá cómo es, dónde estaba, marcas o detalles que lo distingan."
            value={descripcion}
            onChangeText={setDescripcion}
            maxLength={MAX_LARGO.descripcion}
            error={errores.descripcion}
            helper={`${descripcion.length}/${MAX_LARGO.descripcion}`}
            multiline
            autoCapitalize="sentences"
          />

          <View style={styles.bloque}>
            <Text style={typography.label}>Categoría</Text>
            <View style={styles.grillaCategorias}>
              {CATEGORIAS.map((c) => {
                const activa = categoria === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.categoria, activa && styles.categoriaActiva]}
                    onPress={() => {
                      setCategoria(c.id);
                      setErrores((e) => ({ ...e, categoria: undefined }));
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: activa }}
                    accessibilityLabel={c.label}
                  >
                    <Ionicons
                      name={ICONOS_CATEGORIA[c.id] ?? 'apps-outline'}
                      size={26}
                      color={activa ? colors.white : colors.primary}
                    />
                    <Text style={[styles.categoriaTexto, activa && styles.categoriaTextoActivo]} numberOfLines={1}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {errores.categoria ? <MensajeError texto={errores.categoria} /> : null}
          </View>

          <View style={styles.bloque}>
            <Text style={typography.label}>¿Cuándo fue?</Text>
            <FechaHoraField
              value={fechaSuceso}
              onChange={(f) => {
                setFechaSuceso(f);
                setErrores((e) => ({ ...e, fecha: undefined }));
              }}
              error={errores.fecha}
            />
            <Text style={typography.caption}>Franja horaria: {franjaLabel} (según la hora que elegiste)</Text>
          </View>
        </View>
      ) : null}

      {paso === 'ubicacion' ? (
        <View style={styles.paso}>
          <BarrioPicker
            barrios={barrios}
            selectedId={barrioId}
            onSelect={(b) => {
              setBarrioId(b.id);
              setErrores((e) => ({ ...e, barrio: undefined }));
            }}
            error={errores.barrio}
          />
          {errorBarrios ? (
            <View style={styles.bloque}>
              <InlineMessage tone="error" message={`No pudimos cargar los barrios. ${errorBarrios}`} />
              <Button title="Reintentar" icon="refresh" variant="secondary" size="sm" onPress={cargarBarrios} />
            </View>
          ) : null}

          <TextField
            label="Dirección o referencia exacta"
            icon="location-outline"
            placeholder="Ej: Av. Santa Fe 3253, o “cerca de la plaza”"
            value={direccionExacta}
            onChangeText={(t) => {
              setDireccionExacta(t);
              setErrores((e) => ({ ...e, ubicacion: undefined }));
            }}
            helper="Solo la ve quien reclame y vos le aceptes el reclamo."
            autoCapitalize="sentences"
            multiline
            maxLength={MAX_LARGO.direccionExacta}
          />

          <View style={styles.bloque}>
            <Text style={typography.label}>Coordenadas</Text>
            {coordenadasTexto ? (
              <Card style={styles.coordsCard}>
                <View style={styles.coordsFila}>
                  <View style={styles.coordsIcono}>
                    <Ionicons name="navigate" size={18} color={colors.primary} />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={typography.caption}>Ubicación cargada</Text>
                    <Text style={styles.coordsTexto}>{coordenadasTexto}</Text>
                  </View>
                </View>
                <View style={styles.coordsAcciones}>
                  <Button
                    title="Actualizar"
                    icon="refresh"
                    variant="secondary"
                    size="sm"
                    onPress={usarUbicacion}
                    loading={cargandoUbicacion}
                    style={styles.flex1}
                  />
                  <Button
                    title="Quitar"
                    icon="trash-outline"
                    variant="danger"
                    size="sm"
                    onPress={quitarUbicacion}
                    disabled={cargandoUbicacion}
                    style={styles.flex1}
                  />
                </View>
              </Card>
            ) : (
              <Button
                title="Usar mi ubicación actual"
                icon="locate"
                variant="secondary"
                onPress={usarUbicacion}
                loading={cargandoUbicacion}
              />
            )}
            {errores.ubicacion ? <MensajeError texto={errores.ubicacion} /> : null}
          </View>

          {errorUbicacion ? (
            errorUbicacion.tipo === 'permiso' ? (
              <PermisoDenegado
                icon="location-outline"
                titulo="Ubicación sin permiso"
                motivo="No pudimos acceder a tu ubicación. Podés habilitarla en la configuración o escribir la dirección."
                onPedirPermiso={abrirConfiguracion}
              />
            ) : (
              <InlineMessage tone="warning" message={errorUbicacion.mensaje} />
            )
          ) : null}
        </View>
      ) : null}

      {paso === 'verificacion' ? (
        <View style={styles.paso}>
          <Card style={styles.candadoCard}>
            <View style={styles.candadoIcono}>
              <Ionicons name="lock-closed" size={22} color={colors.primary} />
            </View>
            <Text style={styles.candadoTexto}>
              Escribí una pregunta sobre un detalle que NO se vea en las fotos (ej. “¿De qué color es el
              llavero?”) y su respuesta. Así comprobás que quien reclama es el dueño.
            </Text>
          </Card>
          <TextField
            label="Pregunta de verificación"
            placeholder="¿De qué color es el forro?"
            value={preguntaVerificacion}
            onChangeText={setPreguntaVerificacion}
            error={errores.pregunta}
            autoCapitalize="sentences"
            maxLength={MAX_LARGO.preguntaVerificacion}
          />
          <TextField
            label="Respuesta correcta"
            icon="lock-closed-outline"
            placeholder="Solo la ves vos"
            value={respuestaVerificacion}
            onChangeText={setRespuestaVerificacion}
            error={errores.respuesta}
            maxLength={MAX_LARGO.respuestaVerificacion}
            helper="Es privada: nunca se le muestra a nadie, ni siquiera a quien reclama."
          />
        </View>
      ) : null}

      {paso === 'resumen' ? (
        <View style={styles.paso}>
          {sinConexion ? (
            <InlineMessage
              tone="info"
              message="Sin conexión: la guardamos en tu teléfono y se publica sola cuando vuelva la conexión."
            />
          ) : null}
          <Card padded={false} style={styles.resumenCard}>
            {fotos.length > 0 ? (
              <View style={styles.resumenFotos}>
                {fotos.map((foto) => (
                  <Image key={foto.uri} source={{ uri: foto.uri }} style={styles.resumenFoto} />
                ))}
              </View>
            ) : null}
            <View style={styles.resumenCuerpo}>
              <View style={styles.resumenTop}>
                {tipo ? <TipoBadge tipo={tipo} solid /> : null}
                <Button title="Editar" variant="ghost" size="sm" onPress={() => irAlPaso('detalles')} />
              </View>
              <Text style={typography.title}>{titulo.trim()}</Text>
              <Text style={typography.body}>{descripcion.trim()}</Text>
            </View>
          </Card>

          <Card style={styles.resumenFilas}>
            <FilaResumen
              icono="pricetag-outline"
              etiqueta="Categoría"
              valor={categoriaInfo?.label ?? ''}
              onEditar={() => irAlPaso('detalles')}
            />
            <FilaResumen
              icono="calendar-outline"
              etiqueta="Fecha y hora"
              valor={`${formatFecha(fechaSuceso.toISOString(), { conAnio: true })} · ${String(fechaSuceso.getHours()).padStart(2, '0')}:${String(fechaSuceso.getMinutes()).padStart(2, '0')} hs (${franjaLabel})`}
              onEditar={() => irAlPaso('detalles')}
            />
            <FilaResumen
              icono="location-outline"
              etiqueta="Barrio"
              valor={barrioLabel || 'Sin barrio'}
              onEditar={() => irAlPaso('ubicacion')}
            />
            <FilaResumen
              icono="home-outline"
              etiqueta="Dirección exacta"
              valor={direccionExacta.trim() || 'No indicada'}
              onEditar={() => irAlPaso('ubicacion')}
            />
            <FilaResumen
              icono="navigate-outline"
              etiqueta="Coordenadas"
              valor={coordenadasTexto || 'Sin coordenadas'}
              onEditar={() => irAlPaso('ubicacion')}
            />
            {tipo === 'encontrado' ? (
              <>
                <FilaResumen
                  icono="help-circle-outline"
                  etiqueta="Pregunta de verificación"
                  valor={preguntaVerificacion.trim()}
                  onEditar={() => irAlPaso('verificacion')}
                />
                <FilaResumen
                  icono="lock-closed-outline"
                  etiqueta="Respuesta (privada)"
                  valor="••••••••  Solo la ves vos"
                  onEditar={() => irAlPaso('verificacion')}
                />
              </>
            ) : null}
          </Card>

          {errorEnvio ? <InlineMessage tone="error" message={errorEnvio} /> : null}
        </View>
      ) : null}
    </Screen>
  );
}

function ProgresoPasos({ total, actual }) {
  return (
    <View
      style={styles.progreso}
      accessibilityRole="progressbar"
      accessibilityLabel={`Paso ${actual + 1} de ${total}`}
    >
      <View style={styles.progresoBarras}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[styles.progresoBarra, i <= actual && styles.progresoBarraActiva]} />
        ))}
      </View>
      <Text style={typography.overline}>
        Paso {actual + 1} de {total}
      </Text>
    </View>
  );
}

function TarjetaTipo({ icono, titulo, detalle, color, suave, seleccionada, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionada }}
      accessibilityLabel={titulo}
      style={({ pressed }) => [
        styles.tarjetaTipo,
        shadow.sm,
        seleccionada && { borderColor: color, backgroundColor: suave },
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={[styles.tipoIcono, { backgroundColor: seleccionada ? color : suave }]}>
        <Ionicons name={icono} size={34} color={seleccionada ? colors.white : color} />
      </View>
      <View style={styles.flex1}>
        <Text style={typography.title}>{titulo}</Text>
        <Text style={styles.tipoDetalle}>{detalle}</Text>
      </View>
      <Ionicons
        name={seleccionada ? 'checkmark-circle' : 'ellipse-outline'}
        size={26}
        color={seleccionada ? color : colors.borderStrong}
      />
    </Pressable>
  );
}

function MensajeError({ texto }) {
  return (
    <View style={styles.errorFila}>
      <Ionicons name="alert-circle" size={14} color={colors.error} />
      <Text style={styles.errorTexto}>{texto}</Text>
    </View>
  );
}

function FilaResumen({ icono, etiqueta, valor, onEditar }) {
  return (
    <View style={styles.filaResumen}>
      <View style={styles.filaResumenIcono}>
        <Ionicons name={icono} size={18} color={colors.primary} />
      </View>
      <View style={styles.flex1}>
        <Text style={typography.caption}>{etiqueta}</Text>
        <Text style={typography.bodyStrong}>{valor}</Text>
      </View>
      <Pressable
        onPress={onEditar}
        hitSlop={12}
        style={styles.filaResumenEditar}
        accessibilityRole="button"
        accessibilityLabel={`Editar ${etiqueta}`}
      >
        <Ionicons name="create-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  paso: { gap: spacing.md },
  bloque: { gap: spacing.sm },

  progreso: { gap: spacing.xs + 2 },
  progresoBarras: { flexDirection: 'row', gap: spacing.xs + 2 },
  progresoBarra: { flex: 1, height: 6, borderRadius: radius.round, backgroundColor: colors.surface },
  progresoBarraActiva: { backgroundColor: colors.primary },

  footerRow: { flexDirection: 'row', gap: spacing.sm },
  footerAtras: { flex: 0.6 },

  // Tipo
  tarjetasTipo: { gap: spacing.md },
  tarjetaTipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 112,
  },
  tipoIcono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipoDetalle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xxs },

  // Fotos
  grillaFotos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fotoCelda: {
    width: '31.5%',
    aspectRatio: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  fotoImg: { width: '100%', height: '100%' },
  fotoPrincipal: {
    position: 'absolute',
    left: spacing.xs + 2,
    bottom: spacing.xs + 2,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm - 1,
    paddingVertical: 2,
    borderRadius: radius.round,
  },
  fotoPrincipalTexto: { color: colors.white, fontSize: 11, fontWeight: '700' },
  fotoMover: {
    position: 'absolute',
    left: spacing.xs + 2,
    bottom: spacing.xs + 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotoQuitar: {
    position: 'absolute',
    top: spacing.xs + 2,
    right: spacing.xs + 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fotosVacio: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
  },
  contador: { ...typography.caption, textAlign: 'center' },
  fotoBotones: { flexDirection: 'row', gap: spacing.sm },

  // Detalles
  grillaCategorias: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoria: {
    width: '31.5%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs + 2,
    paddingVertical: spacing.md - 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    minHeight: 80,
  },
  categoriaActiva: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoriaTexto: { fontSize: 13, fontWeight: '600', color: colors.text },
  categoriaTextoActivo: { color: colors.white },

  // Ubicación
  coordsCard: { gap: spacing.md - 4 },
  coordsFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  coordsIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coordsTexto: { ...typography.bodyStrong, fontVariant: ['tabular-nums'] },
  coordsAcciones: { flexDirection: 'row', gap: spacing.sm },

  // Verificación
  candadoCard: { flexDirection: 'row', gap: spacing.md - 4, alignItems: 'flex-start', backgroundColor: colors.primarySoft },
  candadoIcono: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  candadoTexto: { ...typography.body, flex: 1, color: colors.textSecondary },

  // Resumen
  resumenCard: { overflow: 'hidden' },
  resumenFotos: { flexDirection: 'row' },
  resumenFoto: { flex: 1, height: 130, backgroundColor: colors.surface },
  resumenCuerpo: { padding: spacing.md, gap: spacing.sm },
  resumenTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  resumenFilas: { gap: spacing.md - 2 },
  filaResumen: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  filaResumenIcono: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filaResumenEditar: { padding: spacing.xs },

  // Borrador
  borradorCard: { gap: spacing.md - 2 },
  borradorHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  borradorIcono: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borradorResumen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md - 4,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  borradorFoto: { width: 56, height: 56, borderRadius: radius.sm },
  borradorTitulo: { ...typography.subheading, marginTop: spacing.xs },

  errorFila: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  errorTexto: { fontSize: 13, color: colors.error, flex: 1 },
});
