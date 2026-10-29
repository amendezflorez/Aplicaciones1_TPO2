import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_BUSQUEDAS_RECIENTES, STORAGE_KEYS } from '../config/constants';

export const SearchContext = createContext(null);

// Últimas búsquedas del buscador guiado (Punto 3): no es dato sensible ni compartido
// entre usuarios, así que vive en AsyncStorage (no en el backend) — sección 3 del plan.
// Cada entrada es el objeto de filtros tal cual lo arma BuscadorInicialScreen, más una
// "etiqueta" corta para mostrar en la lista de últimas búsquedas.
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

  const guardarBusqueda = useCallback((filtros, etiqueta) => {
    setUltimasBusquedas((actuales) => {
      const siguientes = [
        { filtros, etiqueta, fecha: Date.now() },
        ...actuales.filter((b) => b.etiqueta !== etiqueta),
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
