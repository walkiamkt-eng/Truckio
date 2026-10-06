import { useState, useEffect } from 'react';
import { SyncService } from '../services/syncService';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSimulatedOffline = () => {
    setIsSimulatedOffline((prev) => !prev);
  };

  const effectiveOnline = isSimulatedOffline ? false : isOnline;

  // Disparar procesamiento de la cola apenas pase a online
  useEffect(() => {
    if (effectiveOnline) {
      SyncService.processQueue().catch((err) =>
        console.error('Error procesando cola al estar online:', err)
      );
    }
  }, [effectiveOnline]);

  return {
    isOnline: effectiveOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
  };
}