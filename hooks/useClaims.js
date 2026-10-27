import { useContext } from 'react';
import { ClaimsContext } from '../context/ClaimsContext';

export function useClaims() {
  const context = useContext(ClaimsContext);
  if (!context) {
    throw new Error('useClaims debe usarse dentro de <ClaimsProvider>');
  }
  return context;
}
