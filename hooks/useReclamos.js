import { useContext } from 'react';
import { ReclamosContext } from '../context/ReclamosContext';

export function useReclamos() {
  const context = useContext(ReclamosContext);
  if (!context) throw new Error('useReclamos debe usarse dentro de <ReclamosProvider>');
  return context;
}