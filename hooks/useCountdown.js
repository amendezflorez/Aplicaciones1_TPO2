import { useCallback, useEffect, useState } from 'react';

// Cuenta regresiva en segundos (para el cooldown de "Reenviar código").
export function useCountdown(initialSeconds) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const id = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds]);

  const restart = useCallback(() => setSeconds(initialSeconds), [initialSeconds]);

  return { seconds, restart };
}
