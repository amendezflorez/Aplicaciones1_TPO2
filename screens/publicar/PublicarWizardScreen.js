import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import BarrioPicker from '../../components/BarrioPicker';
import Button from '../../components/Button';
import CategoriaPicker from '../../components/CategoriaPicker';
import ErrorText from '../../components/ErrorText';
import Loading from '../../components/Loading';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import { CATEGORIAS, FRANJAS_HORARIAS, MAX_FOTOS_PUBLICACION } from '../../config/constants';
import { colors, radius, spacing } from '../../config/theme';
import { useAuth } from '../../hooks/useAuth';
import { useConnectivity } from '../../hooks/useConnectivity';
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
import { formatDireccionGeocodificada } from '../../utils/publicacionFormatters';
import { conTimeout } from '../../utils/promesaConTimeout';
import { generarIdLocal } from '../../utils/uuid';

const PICKER_OPTIONS_FOTO = { mediaTypes: ['images'], quality: 0.7 };
// ~8s: igual criterio que useUbicacionActual para getCurrentPositionAsync — geocodeAsync
// usa el mismo tipo de proveedor del sistema y puede quedar colgado en el mismo emulador
// sin Google Play Services.
const TIMEOUT_GEOCODING_MS = 8000;
// Largos máximos: los mismos que valida el backend (PublicacionService.crear), que a su vez
// respetan el tamaño de las columnas en la base. Sin esto, un título de más de 255
// caracteres llegaba a la base y el backend respondía 500 en vez de un error claro.
const MAX_LARGO = {
  titulo: 120,
  descripcion: 2000,
  direccionExacta: 255,
  preguntaVerificacion: 200,
  respuestaVerificacion: 100,
};
const ETIQUETAS_PASO = {
  tipo: '¿Qué querés publicar?',
  fotos: 'Fotos',
  detalles: 'Detalles',
  ubicacion: 'Dónde',
  verificacion: 'Verificación',
  resumen: 'Resumen',
};
// Para el aviso "para continuar, completá..." que se muestra cuando "Siguiente" está
// deshabilitado (ver pasoValido/faltantes abajo): un nombre corto por cada clave que
// calcularErrores puede devolver.
const ETIQUETAS_CAMPOS = {
  fotos: 'al menos una foto',
  titulo: 'el título',
  descripcion: 'la descripción',
  categoria: 'la categoría',
  fecha: 'una fecha válida',
  barrio: 'el barrio',
  ubicacion: 'la dirección exacta o tu ubicación actual',
  pregunta: 'la pregunta de verificación',
  respuesta: 'la respuesta de verificación',
};

// Lista de pasos según el tipo: "Verificación" solo existe si tipo=encontrado (la
// pregunta/respuesta están prohibidas para tipo=perdido en el backend). Fuera del
// componente para poder usarla también al restaurar un borrador, antes de que el estado
// de React tenga los datos cargados.
const pasosPara = (tipo) => {
  const base = ['tipo', 'fotos', 'detalles', 'ubicacion'];
  if (tipo === 'encontrado') base.push('verificacion');
  base.push('resumen');
  return base;
};

// Validación pura de un paso a partir de los datos (no del estado de React): la usa el
// render (habilitar "Siguiente"), el botón "Siguiente" y la restauración del borrador
// (para no dejar a la persona en un paso posterior a uno que quedó incompleto, p. ej. si
// se perdió una foto). `d.fechaSuceso` es un Date.
function erroresDe(p, d) {
  const found = {};
  if (p === 'tipo' && !d.tipo) {
    found.tipo = 'Elegí qué querés publicar.';
  }
  if (p === 'fotos' && d.fotos.length === 0) {
    found.fotos = 'Agregá al menos una foto.';
  }
  if (p === 'detalles') {
    if (!d.titulo.trim()) found.titulo = 'El título es obligatorio.';
    if (!d.descripcion.trim()) found.descripcion = 'La descripción es obligatoria.';
    if (!d.categoria) found.categoria = 'Elegí una categoría.';
    if (d.fechaSuceso > new Date()) found.fecha = 'La fecha no puede ser futura.';
  }
  if (p === 'ubicacion') {
    if (!d.barrioId) found.barrio = 'Elegí el barrio.';
    // "ya sea escribiéndola o tomando la ubicación actual" (consigna del TP): alcanza
    // con una de las dos, no hace falta exigir las dos.
    const tieneDireccion = Boolean(d.direccionExacta.trim());
    const tieneCoordenadas = d.latExacta != null && d.lngExacta != null;
    if (!tieneDireccion && !tieneCoordenadas) {
      found.ubicacion = 'Escribí la dirección exacta o usá tu ubicación actual.';
    }
  }
  if (p === 'verificacion') {
    if (!d.preguntaVerificacion.trim()) found.pregunta = 'Cargá una pregunta de verificación.';
    if (!d.respuestaVerificacion.trim()) found.respuesta = 'Cargá la respuesta correcta.';
  }
  return found;
}

// Índice del paso donde retomar un borrador: el paso guardado (`guardado.paso`, por
// NOMBRE y no por número, porque la cantidad de pasos cambia según el tipo), salvo que un
// paso anterior haya quedado incompleto — ahí se frena en el primero incompleto. Un
// borrador viejo (de antes de guardar el paso) o con un paso que ya no existe para ese
// tipo cae directo en el primer paso incompleto: nunca rompe, en el peor caso es el 0.
function indiceParaRetomar(pasoGuardado, datos) {
  const pasos = pasosPara(datos.tipo);
  const primerIncompleto = pasos.findIndex((p) => Object.keys(erroresDe(p, datos)).length > 0);
  const tope = primerIncompleto === -1 ? pasos.length - 1 : primerIncompleto;
  const guardado = pasos.indexOf(pasoGuardado);
  return guardado === -1 ? tope : Math.min(guardado, tope);
}

// Wizard de carga guiada del Punto 5 (sección 4 de PLAN_puntos_5_y_6.md). Una sola
// pantalla con pasos internos vía useState, mismo espíritu que BuscadorInicialScreen (acá
// con un motivo extra: todo el estado tiene que viajar junto a cada autoguardado del
// borrador, y repartirlo en varias pantallas del stack obligaría a pasarlo de params en
// params o a un Context nuevo solo para esto). El paso "Verificación" solo existe si
// tipo=encontrado (la pregunta/respuesta están prohibidas para tipo=perdido en el
// backend), así que la lista de pasos se arma dinámicamente.
export default function PublicarWizardScreen({ route, navigation }) {
  const { user } = useAuth();
  const { sinConexion } = useConnectivity();
  const {
    cargando: cargandoUbicacion,
    error: errorUbicacion,
    obtenerUbicacion,
    abrirConfiguracion,
  } = useUbicacionActual();

  const [listo, setListo] = useState(false); // true recién cuando se resolvió si había borrador
  const [indice, setIndice] = useState(0);
  const [errores, setErrores] = useState({});

  const [tipo, setTipo] = useState(null);
  const [fotos, setFotos] = useState([]); // [{ uri, url }], url null hasta subirla
  const [copiandoFoto, setCopiandoFoto] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [categoria, setCategoria] = useState(null);
  const [fechaSuceso, setFechaSuceso] = useState(new Date());
  const [mostrarFecha, setMostrarFecha] = useState(false);
  const [franjaHoraria, setFranjaHoraria] = useState(null);
  const [barrioId, setBarrioId] = useState(null);
  const [barrios, setBarrios] = useState([]);
  const [direccionExacta, setDireccionExacta] = useState('');
  const [latExacta, setLatExacta] = useState(null);
  const [lngExacta, setLngExacta] = useState(null);
  const [preguntaVerificacion, setPreguntaVerificacion] = useState('');
  const [respuestaVerificacion, setRespuestaVerificacion] = useState('');
  const [clientRequestId, setClientRequestId] = useState(null);

  const [publicando, setPublicando] = useState(false);
  // true una vez publicada o encolada: el autoguardado (debounce de 600ms) no debe volver a
  // escribir el borrador después — si no, reaparece como "Publicación sin terminar" con el
  // mismo clientRequestId del ítem encolado, y descartarlo borraría sus fotos.
  const terminadoRef = useRef(false);
  const enviandoRef = useRef(false); // candado contra doble envío, ver publicar()
  const [errorEnvio, setErrorEnvio] = useState('');

  const pasos = useMemo(() => pasosPara(tipo), [tipo]);
  const paso = pasos[Math.min(indice, pasos.length - 1)];

  useEffect(() => {
    getBarrios()
      .then(setBarrios)
      .catch(() => {});
  }, []);

  // Al entrar: si hay un borrador guardado de este usuario, ofrecer retomarlo o
  // descartarlo (sección 4.3 del plan) antes de mostrar el wizard. Si no hay borrador, o
  // si se descarta, arranca de cero aplicando el prefill que haya llegado por params
  // (tipo/categoria/barrioId, desde el estado vacío de ResultadosScreen).
  useEffect(() => {
    let vigente = true;
    const iniciarDesdeParams = () => {
      const params = route.params ?? {};
      if (params.tipo) setTipo(params.tipo);
      if (params.categoria) setCategoria(params.categoria);
      if (params.barrioId) setBarrioId(params.barrioId);
      setClientRequestId(generarIdLocal());
    };
    // Restaura TODO el estado del borrador, incluido el paso donde había quedado. Antes el
    // paso no se guardaba y "Retomar" siempre volvía al paso 1 (perdí/encontré) con los
    // datos cargados: la consigna pide retomarlo donde se dejó.
    const aplicarBorrador = async (guardado) => {
      // Reusa el mismo clientRequestId del borrador: si ese intento ya había llegado a
      // crear la publicación en el backend pero la respuesta no volvió, publicar de
      // nuevo con el mismo id no duplica (sección 4.1 del plan).
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
        franjaHoraria: guardado.franjaHoraria ?? null,
        barrioId: guardado.barrioId ?? null,
        direccionExacta: guardado.direccionExacta ?? '',
        latExacta: guardado.latExacta ?? null,
        lngExacta: guardado.lngExacta ?? null,
        preguntaVerificacion: guardado.preguntaVerificacion ?? '',
        respuestaVerificacion: guardado.respuestaVerificacion ?? '',
      };
      if (!vigente) return;
      setTipo(datos.tipo);
      setFotos(datos.fotos);
      setTitulo(datos.titulo);
      setDescripcion(datos.descripcion);
      setCategoria(datos.categoria);
      setFechaSuceso(datos.fechaSuceso);
      setFranjaHoraria(datos.franjaHoraria);
      setBarrioId(datos.barrioId);
      setDireccionExacta(datos.direccionExacta);
      setLatExacta(datos.latExacta);
      setLngExacta(datos.lngExacta);
      setPreguntaVerificacion(datos.preguntaVerificacion);
      setRespuestaVerificacion(datos.respuestaVerificacion);
      setClientRequestId(idRestaurado);
      setIndice(indiceParaRetomar(guardado.paso, datos));
      if (perdidas > 0) {
        Alert.alert(
          'Faltan fotos',
          perdidas === 1
            ? 'Una de las fotos del borrador ya no está disponible en el dispositivo. Volvé a agregarla.'
            : `${perdidas} fotos del borrador ya no están disponibles en el dispositivo. Volvé a agregarlas.`
        );
      }
    };

    const retomar = async (guardado) => {
      try {
        await aplicarBorrador(guardado);
      } catch (e) {
        // Nunca dejar la pantalla colgada en <Loading />: si algo del borrador no se pudo
        // restaurar, se arranca de cero con el prefill.
        console.warn('No se pudo restaurar el borrador', e);
        if (vigente) iniciarDesdeParams();
      }
      if (vigente) setListo(true);
    };

    cargarBorrador(user.id).then((guardado) => {
      if (!vigente) return;
      // "Editar" desde Mis publicaciones (ítem de la cola con error) llega con
      // retomar:true: la persona ya eligió editar esa publicación, así que se abre directo
      // en vez de preguntarle "¿Retomar o descartar?" (Descartar ahí era confuso).
      if (guardado && route.params?.retomar) {
        retomar(guardado);
        return;
      }
      if (guardado) {
        Alert.alert(
          'Publicación sin terminar',
          'Tenés una publicación empezada. ¿Querés retomarla o empezar de nuevo?',
          [
            {
              text: 'Descartar',
              style: 'destructive',
              onPress: async () => {
                // El clientRequestId del borrador cargado (no el del estado: todavía no
                // se seteó ninguno en este punto del montaje). Si ese id ya está en la
                // cola offline (registro re-escrito por el autoguardado antes de este
                // arreglo), sus fotos son las del ítem pendiente: solo se borra el
                // registro, nunca la carpeta.
                if (await obtenerItem(user.id, guardado.clientRequestId)) {
                  await borrarRegistroBorrador(user.id);
                } else {
                  await borrarBorrador(user.id, guardado.clientRequestId);
                }
                if (vigente) {
                  iniciarDesdeParams();
                  setListo(true);
                }
              },
            },
            {
              text: 'Retomar',
              onPress: () => retomar(guardado),
            },
          ],
          { cancelable: false }
        );
      } else {
        iniciarDesdeParams();
        setListo(true);
      }
    });

    return () => {
      vigente = false;
    };
    // Solo al montar: route.params es el prefill inicial, no algo que deba reaplicarse en
    // cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Autoguardado con debounce (sección 4.3 del plan): persiste el borrador 600ms después
  // del último cambio, no en cada tecla — evita escribir a AsyncStorage en cada letra
  // tipeada en título/descripción. No corre hasta que `listo` (ya se resolvió si había que
  // retomar/descartar), para no pisar un borrador existente con el estado inicial vacío
  // mientras todavía se está preguntando.
  //
  // guardarAhoraRef siempre apunta a una función con el estado del ÚLTIMO render, para
  // poder llamarla desde listeners que se registran una sola vez (AppState, desmontaje).
  // No guarda un wizard "vacío" (todavía en el paso 1 y sin fotos): si no, con solo abrir
  // y cerrar el wizard aparecía después el aviso "Publicación sin terminar".
  const guardarAhoraRef = useRef(() => {});
  // Efecto sin dependencias = corre después de cada render (React no permite escribir una
  // ref durante el render mismo).
  useEffect(() => {
    guardarAhoraRef.current = () => {
      if (!listo || terminadoRef.current || !clientRequestId) return;
      if (indice === 0 && fotos.length === 0) return;
      guardarBorrador(user.id, construirBorrador());
    };
  });

  useEffect(() => {
    if (!listo) return undefined;
    const id = setTimeout(() => guardarAhoraRef.current(), 600);
    return () => clearTimeout(id);
  }, [
    listo,
    paso, // cambiar de paso también es progreso a guardar (antes no disparaba guardado)
    tipo,
    fotos,
    titulo,
    descripcion,
    categoria,
    fechaSuceso,
    franjaHoraria,
    barrioId,
    direccionExacta,
    latExacta,
    lngExacta,
    preguntaVerificacion,
    respuestaVerificacion,
  ]);

  // Sin esperar el debounce: al mandar la app a segundo plano (el sistema puede matarla
  // ahí mismo) y al salir de la pantalla, se guarda en el acto para no perder los
  // últimos 600ms de cambios.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') guardarAhoraRef.current();
    });
    return () => {
      sub.remove();
      guardarAhoraRef.current();
    };
  }, []);

  const usarUbicacion = async () => {
    const coords = await obtenerUbicacion();
    if (!coords) return;
    setLatExacta(coords.lat);
    setLngExacta(coords.lng);
    // Sugerencia editable de dirección (sección 10.x del plan): solo si la persona
    // todavía no escribió nada, para no pisar lo que ya cargó a mano. Si el reverse
    // geocoding falla o no devuelve nada, NO es un error — el campo queda como estaba y
    // la persona puede completarlo ella misma (o dejarlo vacío: ya alcanza con tener
    // coordenadas).
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

  // Mejor esfuerzo inverso al de arriba: si la persona solo escribió la dirección (sin
  // usar el GPS), intenta resolver coordenadas a partir de ese texto. No bloquea nada —se
  // dispara en segundo plano al salir del paso "Ubicación" (ver siguiente()) y, si falla o
  // tarda de más, el alta igual funciona sin latExacta/lngExacta (sección 4.2 del plan
  // 5/6: el backend acepta "solo dirección escrita" y usa el centro del barrio como
  // respaldo para el mapa).
  const intentarGeocodificarDireccion = async (texto) => {
    // En Android geocodeAsync exige permiso de ubicación, y sin red el Geocoder del sistema
    // no responde: en esos casos se saltea en silencio (no se pide permiso solo para esto
    // — el backend usa las coordenadas del barrio).
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
      // Updater funcional con "??": si mientras tanto la persona ya tocó "Usar mi
      // ubicación actual" y consiguió coordenadas reales, no las pisamos con esto.
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
    } catch {
      Alert.alert('No se pudo guardar la foto', 'Intentá de nuevo.');
    } finally {
      setCopiandoFoto(false);
    }
  };

  // Antes estas llamadas no tenían catch: si el picker o la cámara fallaban (p. ej. no hay
  // app de cámara, o el sistema mata la actividad) quedaba una promesa rechazada sin
  // manejar y la persona no se enteraba de nada.
  const elegirDeGaleria = async () => {
    const restantes = MAX_FOTOS_PUBLICACION - fotos.length;
    if (restantes <= 0) return;
    try {
      // Sin pedir permiso de galería a propósito: en Android el selector de fotos del
      // sistema no lo necesita.
      const result = await ImagePicker.launchImageLibraryAsync({
        ...PICKER_OPTIONS_FOTO,
        allowsMultipleSelection: true,
        // Recorta igual por si el dispositivo ignora selectionLimit: nunca más de MAX_FOTOS_PUBLICACION.
        selectionLimit: restantes,
      });
      if (!result.canceled) await agregarFotos((result.assets ?? []).slice(0, restantes));
    } catch (e) {
      console.warn('No se pudo abrir la galería', e);
      Alert.alert('No se pudo abrir la galería', 'Intentá de nuevo.');
    }
  };

  const tomarFoto = async () => {
    if (fotos.length >= MAX_FOTOS_PUBLICACION) return;
    try {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) {
        // canAskAgain=false: la persona lo negó "para siempre" y el sistema ya no muestra
        // el diálogo; la única forma de habilitarlo es desde la configuración del
        // dispositivo (mismo criterio que el permiso de ubicación en el paso "Dónde").
        Alert.alert(
          'Permiso necesario',
          'Habilitá el acceso a la cámara para tomar la foto. También podés elegirla desde la galería.',
          permiso.canAskAgain
            ? [{ text: 'OK' }]
            : [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Abrir configuración', onPress: () => Linking.openSettings() },
              ]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS_FOTO);
      if (!result.canceled) await agregarFotos(result.assets ?? []);
    } catch (e) {
      console.warn('No se pudo usar la cámara', e);
      Alert.alert('No se pudo abrir la cámara', 'Intentá de nuevo o elegí la foto desde la galería.');
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

  const elegirTipo = (valor) => {
    setTipo(valor);
    setIndice(1);
  };

  // Pura (no toca estado): se usa tanto para habilitar/deshabilitar "Siguiente" en cada
  // render (pasoValido abajo) como, al tocar "Siguiente", para decidir si avanzar y qué
  // errores mostrar por campo.
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

  // Antes "Siguiente" solo validaba al tocarlo, así que se podía avanzar de un paso vacío
  // con un solo toque extra; ahora el botón queda deshabilitado hasta que el paso actual
  // esté completo (se recalcula en cada render, son chequeos baratos). "faltantes" es el
  // mismo cálculo convertido en texto, para avisar qué falta mientras el botón está
  // deshabilitado (antes no se mostraba nada hasta tocarlo, y al estar deshabilitado ya no
  // se podía ni tocar para enterarse).
  const erroresPasoActual = calcularErrores(paso);
  const pasoValido = Object.keys(erroresPasoActual).length === 0;
  const faltantes = Object.keys(erroresPasoActual).map((clave) => ETIQUETAS_CAMPOS[clave] ?? clave);

  const siguiente = () => {
    const found = calcularErrores(paso);
    setErrores(found);
    if (Object.keys(found).length > 0) return;
    // Mejor esfuerzo, en segundo plano: si se sale de "Ubicación" solo con dirección
    // escrita (sin GPS), intenta resolver coordenadas a partir del texto sin bloquear el
    // avance — si no llega a tiempo o falla, el alta igual funciona (ver sección 4.2 del
    // plan 5/6).
    if (paso === 'ubicacion' && (latExacta == null || lngExacta == null) && direccionExacta.trim()) {
      intentarGeocodificarDireccion(direccionExacta.trim());
    }
    if (indice >= pasos.length - 1) {
      publicar();
      return;
    }
    setIndice(indice + 1);
  };

  const atras = () => {
    setErrores({});
    setIndice(Math.max(0, indice - 1));
  };

  // Botón "atrás" de Android (y la flecha del header): como los pasos son estado interno
  // de UNA pantalla y no pantallas del stack, por defecto salían del wizard entero. Ahora
  // retroceden un paso, igual que el botón "Atrás"; recién en el primer paso salen de la
  // pantalla (el borrador queda guardado igual). No intercepta la salida después de
  // publicar/encolar (navigate a MisPublicaciones no es GO_BACK/POP, y terminadoRef).
  useEffect(
    () =>
      navigation.addListener('beforeRemove', (e) => {
        if (terminadoRef.current || indice === 0) return;
        const accion = e.data.action.type;
        if (accion !== 'GO_BACK' && accion !== 'POP') return;
        e.preventDefault();
        setErrores({});
        setIndice((actual) => Math.max(0, actual - 1));
      }),
    [navigation, indice]
  );

  // Punto 6 (sección 4.4 del plan): sin conexión, el alta no se intenta (o se intenta y
  // falla por red) — la publicación se encola en vez de perderse, y la cola la procesa
  // services/offline/colaProcesador.js cuando vuelva la conexión. construirBorrador() se
  // llama de nuevo acá (no se reusa `base`) para capturar el progreso real de `fotos`:
  // onFotoSubida ya lo fue guardando en el borrador mientras enviarPublicacion subía lo
  // que pudo antes de fallar.
  const encolarYSalir = async () => {
    terminadoRef.current = true;
    try {
      await agregarACola(user.id, construirBorrador());
    } catch {
      // No se pudo guardar en la cola (almacenamiento lleno, etc.): el borrador sigue
      // intacto (agregarACola no lo borra si falla), así que se vuelve a habilitar el
      // autoguardado y se avisa en vez de mostrar un "guardamos tu publicación" falso.
      terminadoRef.current = false;
      setPublicando(false);
      setErrorEnvio('No hay conexión y no pudimos guardar la publicación para enviarla después. Intentá de nuevo.');
      return;
    }
    setPublicando(false);
    Alert.alert(
      'Sin conexión',
      'Guardamos tu publicación. La vamos a enviar automáticamente apenas vuelva la conexión — podés verla en "Mis publicaciones" como pendiente de envío.',
      [{ text: 'Ver mis publicaciones', onPress: () => navigation.navigate('MisPublicaciones') }]
    );
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
        // mitad de camino, "Retomar" (o la cola offline) en el próximo intento no las
        // vuelve a subir.
        onFotoSubida: (foto, url) => {
          setFotos((actuales) => {
            const siguientes = actuales.map((f) => (f.uri === foto.uri ? { ...f, url } : f));
            if (!terminadoRef.current) guardarBorrador(user.id, { ...base, fotos: siguientes });
            return siguientes;
          });
        },
      });
      terminadoRef.current = true;
      await borrarBorrador(user.id, clientRequestId);
      Alert.alert('¡Listo!', 'Tu publicación ya está activa.', [
        { text: 'Ver mis publicaciones', onPress: () => navigation.navigate('MisPublicaciones') },
      ]);
    } catch (e) {
      // Una foto ya no existe en el dispositivo: se sacan las que faltan y se vuelve al
      // paso de fotos (no es un error de red, encolarla no serviría de nada).
      if (e.code === FOTO_FALTANTE) {
        setFotos((actuales) => actuales.filter((f) => f.url || existeArchivo(f.uri)));
        setIndice(pasos.indexOf('fotos'));
        Alert.alert('Falta una foto', e.message);
        return;
      }
      // NetInfo pudo no haber avisado todavía (o el problema es que el propio backend es
      // inalcanzable, no la red del dispositivo): si la request falló sin respuesta,
      // tratamos esto como offline igual, aunque sinConexion dijera que sí había conexión.
      if (esErrorDeRed(e)) {
        await encolarYSalir();
        return;
      }
      setErrorEnvio(getErrorMessage(e));
    } finally {
      setPublicando(false);
    }
  };

  if (!listo) return <Loading />;

  const categoriaLabel = CATEGORIAS.find((c) => c.id === categoria)?.label ?? '';
  const barrioLabel = barrios.find((b) => b.id === barrioId)?.name ?? '';
  const franjaLabel = FRANJAS_HORARIAS.find((f) => f.id === franjaHoraria)?.label ?? '';

  return (
    <Screen>
      <Text style={styles.pasoIndicador}>
        Paso {indice + 1} de {pasos.length} — {ETIQUETAS_PASO[paso]}
      </Text>

      {paso === 'tipo' ? (
        // Copy e íconos deliberadamente distintos a los del paso 1 de BuscadorInicialScreen
        // (😟 "Perdí algo" / 🔎 "Encontré algo"): ahí la persona describe lo que le pasó
        // para buscar lo que otros publicaron; acá está a punto de crear su propia
        // publicación, así que el texto lo dice explícitamente ("Publicar algo que...") en
        // vez de repetir la misma pregunta del buscador, que generaba confusión.
        <View style={styles.opciones}>
          <TouchableOpacity style={styles.opcionGrande} onPress={() => elegirTipo('perdido')}>
            <Text style={styles.opcionEmoji}>📝</Text>
            <Text style={styles.opcionTexto}>Publicar algo que perdí</Text>
            <Text style={styles.opcionSubtexto}>Para que alguien que lo encontró pueda avisarte</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.opcionGrande} onPress={() => elegirTipo('encontrado')}>
            <Text style={styles.opcionEmoji}>📣</Text>
            <Text style={styles.opcionTexto}>Publicar algo que encontré</Text>
            <Text style={styles.opcionSubtexto}>Para ayudar a que vuelva a su dueño</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {paso === 'fotos' ? (
        <View style={styles.paso}>
          <Text style={styles.ayuda}>Sacá fotos con la cámara o elegilas de la galería (hasta {MAX_FOTOS_PUBLICACION}).</Text>
          {fotos.length > 0 ? (
            <View style={styles.fotosGrid}>
              {fotos.map((foto, index) => (
                <View key={foto.uri} style={styles.fotoThumbWrap}>
                  <Image source={{ uri: foto.uri }} style={styles.fotoThumb} />
                  <View style={styles.fotoThumbAcciones}>
                    <TouchableOpacity disabled={index === 0} onPress={() => moverFoto(index, -1)}>
                      <Text style={[styles.fotoAccion, index === 0 && styles.fotoAccionDisabled]}>◀</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => eliminarFoto(index)}>
                      <Text style={styles.fotoAccionEliminar}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={index === fotos.length - 1}
                      onPress={() => moverFoto(index, 1)}
                    >
                      <Text style={[styles.fotoAccion, index === fotos.length - 1 && styles.fotoAccionDisabled]}>▶</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.fotoBotones}>
            <Button
              title="Cámara"
              variant="secondary"
              onPress={tomarFoto}
              disabled={fotos.length >= MAX_FOTOS_PUBLICACION}
              loading={copiandoFoto}
            />
            <Button
              title="Galería"
              variant="secondary"
              onPress={elegirDeGaleria}
              disabled={fotos.length >= MAX_FOTOS_PUBLICACION}
              loading={copiandoFoto}
            />
          </View>
          <ErrorText message={errores.fotos} />
        </View>
      ) : null}

      {paso === 'detalles' ? (
        <View style={styles.paso}>
          <TextField
            label="Título"
            value={titulo}
            onChangeText={setTitulo}
            error={errores.titulo}
            maxLength={MAX_LARGO.titulo}
          />
          <TextField
            label="Descripción"
            value={descripcion}
            onChangeText={setDescripcion}
            error={errores.descripcion}
            multiline
            maxLength={MAX_LARGO.descripcion}
          />
          <View>
            <Text style={styles.label}>Categoría</Text>
            <CategoriaPicker selected={categoria} onSelect={setCategoria} allowEmpty={false} />
            <ErrorText message={errores.categoria} />
          </View>
          <View>
            <Text style={styles.label}>Fecha del suceso</Text>
            <TouchableOpacity style={styles.fechaField} onPress={() => setMostrarFecha(true)}>
              <Text style={styles.fechaValue}>{fechaSuceso.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <ErrorText message={errores.fecha} />
          </View>
          {mostrarFecha ? (
            // onChange está deprecado desde la versión instalada (confirmado contra
            // src/index.d.ts del paquete, no de memoria) a favor de onValueChange (solo
            // cuando la persona confirma una fecha) + onDismiss (al cerrar sin elegir).
            <DateTimePicker
              value={fechaSuceso}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onValueChange={(event, selectedDate) => {
                setMostrarFecha(false);
                setFechaSuceso(selectedDate);
              }}
              onDismiss={() => setMostrarFecha(false)}
            />
          ) : null}
          <View>
            <Text style={styles.label}>Franja horaria (opcional)</Text>
            <View style={styles.chips}>
              {FRANJAS_HORARIAS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[styles.chip, franjaHoraria === f.id && styles.chipActive]}
                  onPress={() => setFranjaHoraria(franjaHoraria === f.id ? null : f.id)}
                >
                  <Text style={[styles.chipText, franjaHoraria === f.id && styles.chipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      ) : null}

      {paso === 'ubicacion' ? (
        <View style={styles.paso}>
          <BarrioPicker barrios={barrios} selectedId={barrioId} onSelect={(b) => setBarrioId(b.id)} error={errores.barrio} />
          {/* Ya no es obligatorio junto con las coordenadas (sección 4.2 del plan 5/6):
             "ya sea escribiéndola o tomando la ubicación actual" — alcanza con una de las
             dos, por eso el label aclara que es opcional si se usa el GPS. */}
          <TextField
            label="Dirección o referencia exacta (opcional si usás tu ubicación)"
            placeholder="Ej: Av. Santa Fe 3253, o “cerca de la plaza”"
            value={direccionExacta}
            onChangeText={setDireccionExacta}
            multiline
            maxLength={MAX_LARGO.direccionExacta}
          />
          {/* A diferencia de BarrioOUbicacionPicker (buscador, donde barrio y ubicación son
             excluyentes), acá los dos campos conviven: el barrio ubica la publicación en el
             buscador, las coordenadas son el dato exacto que solo se revela si hay un
             reclamo aceptado (gating ya resuelta por el backend, sección 4.6 del plan). */}
          {latExacta != null && lngExacta != null ? (
            <View style={styles.ubicacionRow}>
              <Text style={styles.ubicacionText}>📍 Coordenadas capturadas</Text>
              <Button title="Actualizar" variant="secondary" onPress={usarUbicacion} loading={cargandoUbicacion} />
            </View>
          ) : (
            <Button
              title="Usar mi ubicación actual"
              variant="secondary"
              onPress={usarUbicacion}
              loading={cargandoUbicacion}
            />
          )}
          <ErrorText message={errores.ubicacion} />
          {errorUbicacion ? (
            <View style={styles.errorUbicacionBox}>
              <ErrorText message={errorUbicacion.mensaje} />
              {errorUbicacion.tipo === 'permiso' ? (
                <Button title="Abrir configuración" variant="secondary" onPress={abrirConfiguracion} />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {paso === 'verificacion' ? (
        <View style={styles.paso}>
          <Text style={styles.ayuda}>
            Cargá una pregunta sobre un detalle que NO se vea en las fotos (ej. “¿De qué color es el forro?”) y su
            respuesta. Así podés confirmar que quien reclama de verdad es el dueño.
          </Text>
          <TextField
            label="Pregunta de verificación"
            value={preguntaVerificacion}
            onChangeText={setPreguntaVerificacion}
            error={errores.pregunta}
            maxLength={MAX_LARGO.preguntaVerificacion}
          />
          <TextField
            label="Respuesta correcta"
            value={respuestaVerificacion}
            onChangeText={setRespuestaVerificacion}
            error={errores.respuesta}
            maxLength={MAX_LARGO.respuestaVerificacion}
          />
          <Text style={styles.ayudaPrivada}>🔒 La respuesta es privada: nunca se le muestra a nadie, ni siquiera a quien reclama.</Text>
        </View>
      ) : null}

      {paso === 'resumen' ? (
        <View style={styles.paso}>
          <Text style={styles.resumenTitulo}>{titulo}</Text>
          <Text style={styles.ayuda}>
            {tipo === 'perdido' ? 'Perdí algo' : 'Encontré algo'} · {categoriaLabel} · {barrioLabel || 'Sin barrio'}
          </Text>
          <Text style={styles.ayuda}>{fechaSuceso.toLocaleDateString()}{franjaLabel ? ` · ${franjaLabel}` : ''}</Text>
          <Text style={styles.descripcionResumen}>{descripcion}</Text>
          {fotos.length > 0 ? (
            <View style={styles.fotosGrid}>
              {fotos.map((foto) => (
                <Image key={foto.uri} source={{ uri: foto.uri }} style={styles.fotoThumb} />
              ))}
            </View>
          ) : null}
          {tipo === 'encontrado' ? (
            <Text style={styles.ayuda}>Con pregunta de verificación cargada (respuesta privada).</Text>
          ) : null}
          <ErrorText message={errorEnvio} />
        </View>
      ) : null}

      {/* El paso "tipo" no tiene barra de botones: elegir una opción ya avanza sola
         (elegirTipo), igual que el paso 1 de BuscadorInicialScreen — no hace falta un
         "Siguiente" que, además, antes se podía tocar sin haber elegido nada. */}
      {paso !== 'tipo' ? (
        <>
          {/* Con el botón deshabilitado no había forma de enterarse de qué faltaba (el
             onPress nunca se disparaba para mostrar los errores por campo) — este aviso
             cubre ese hueco mientras pasoValido es false. */}
          {!pasoValido ? <Text style={styles.faltantes}>Para continuar, completá: {faltantes.join(', ')}.</Text> : null}
          <View style={styles.botones}>
            {indice > 0 ? <Button title="Atrás" variant="secondary" onPress={atras} disabled={publicando} /> : null}
            <Button
              title={paso === 'resumen' ? 'Publicar' : 'Siguiente'}
              onPress={siguiente}
              loading={publicando}
              disabled={!pasoValido}
            />
          </View>
        </>
      ) : null}
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
  opcionSubtexto: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  paso: {
    gap: spacing.md,
  },
  ayuda: {
    fontSize: 13,
    color: colors.textMuted,
  },
  ayudaPrivada: {
    fontSize: 13,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  fotosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fotoThumbWrap: {
    width: 90,
    gap: 2,
  },
  fotoThumb: {
    width: 90,
    height: 90,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  fotoThumbAcciones: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  fotoAccion: {
    fontSize: 16,
    color: colors.primary,
    paddingHorizontal: 4,
  },
  fotoAccionDisabled: {
    color: colors.border,
  },
  fotoAccionEliminar: {
    fontSize: 16,
    color: colors.error,
    paddingHorizontal: 4,
  },
  fotoBotones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  fechaField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  fechaValue: {
    fontSize: 16,
    color: colors.text,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.round,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md - 4,
    backgroundColor: colors.background,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.white,
    fontWeight: '600',
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
  errorUbicacionBox: {
    gap: spacing.xs,
  },
  faltantes: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  resumenTitulo: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  descripcionResumen: {
    fontSize: 15,
    color: colors.text,
    lineHeight: 21,
  },
  botones: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
