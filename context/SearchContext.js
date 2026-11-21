import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_BUSQUEDAS_RECIENTES, STORAGE_KEYS } from '../config/constants';
import { claveDeFiltros, resumenDeFiltros } from '../utils/busqueda';

export const SearchContext = createContext(null);

// Últimas búsquedas del buscador guiado (Punto 3): no es dato sensible ni compartido
// entre usuarios, así que vive en AsyncStorage (no en el backend) — sección 3 del plan.
// Cada entrada es el objeto de filtros tal cual lo arma BuscadorInicialScreen, más el
// nombre del barrio y una "etiqueta" con el resumen de criterios para las tarjetas.
export function SearchProvider({ children }) {
  const [ultimasBusquedas, setUltimasBusquedas] = useState([]);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEYS.ultimasBusquedas)
      .then((raw) => {
        if (raw) setUltimasBusquedas(JSON.parse(raw));
      })
      .catch(() => {
        // Si el JSON guardado está corrupto, arrancamos de cero en vez de romper la pantalla.
      })
      .finally(() => setCargado(true));
  }, []);

  // Dedupe por criterios completos (claveDeFiltros), no por la etiqueta: dos búsquedas que
  // difieren solo en el texto o en las fechas son búsquedas distintas. barrioNombre se guarda
  // aparte porque los filtros solo llevan el id del barrio y la tarjeta necesita el nombre.
  const guardarBusqueda = useCallback((filtros, barrioNombre) => {
    const clave = claveDeFiltros(filtros);
    setUltimasBusquedas((actuales) => {
      const siguientes = [
        { clave, filtros, barrioNombre: barrioNombre ?? null, etiqueta: resumenDeFiltros(filtros, barrioNombre), fecha: Date.now() },
        ...actuales.filter((b) => (b.clave ?? claveDeFiltros(b.filtros)) !== clave),
      ].slice(0, MAX_BUSQUEDAS_RECIENTES);
      AsyncStorage.setItem(STORAGE_KEYS.ultimasBusquedas, JSON.stringify(siguientes)).catch(() => {});
      return siguientes;
    });
  }, []);

  const value = useMemo(
    () => ({ ultimasBusquedas, cargado, guardarBusqueda }),
    [ultimasBusquedas, cargado, guardarBusqueda]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}
