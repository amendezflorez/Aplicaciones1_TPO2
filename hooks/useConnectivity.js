import { useContext } from 'react';
import { ConnectivityContext } from '../context/ConnectivityContext';

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (!context) {
    throw new Error('useConnectivity debe usarse dentro de <ConnectivityProvider>');
  }
  return context;
}
