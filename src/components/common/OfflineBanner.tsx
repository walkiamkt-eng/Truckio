import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.ts';
import { StorageService, TRUCKIO_STATE_CHANGED } from '../../services/storageService.ts';
import confetti from 'canvas-confetti';

export const OfflineBanner: React.FC = () => {
  const { isOnline, isSimulatedOffline, toggleSimulatedOffline } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const checkQueue = async () => {
    try {
      const queue = await StorageService.getOfflineQueue();
      setPendingCount(queue.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkQueue();
    window.addEventListener(TRUCKIO_STATE_CHANGED, checkQueue);
    return () => window.removeEventListener(TRUCKIO_STATE_CHANGED, checkQueue);
  }, []);

  const handleSyncNow = async () => {
    if (!isOnline) {
      alert('Debes estar en línea para sincronizar con el servidor central. Desactiva el modo offline o reconéctate a internet.');
      return;
    }
    setSyncing(true);
    setLastSyncMessage(null);
    try {
      const result = await StorageService.syncOfflineQueue();
      setLastSyncMessage(result.message);
      if (result.syncedCount > 0) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.1 },
        });
      }
      await checkQueue();
    } catch (err: any) {
      setLastSyncMessage('Error durante la sincronización: ' + (err.message || 'Error desconocido'));
    } finally {
      setSyncing(false);
      setTimeout(() => setLastSyncMessage(null), 5000);
    }
  };

  if (isOnline && pendingCount === 0 && !lastSyncMessage) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 text-xs py-2 px-4">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-400 font-semibold border border-amber-500/30">
              <WifiOff className="w-3.5 h-3.5 animate-pulse" />
              <span>Modo Sin Conexión {isSimulatedOffline ? '(Simulado)' : '(Red Caída)'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Conexión Restablecida</span>
            </div>
          )}

          <span className="text-slate-300 hidden sm:inline">
            {!isOnline
              ? 'Todos tus registros y fotos se guardan en IndexedDB local y se sincronizarán al volver a tener red.'
              : 'Conectado a la base de datos central.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20">
              {pendingCount} {pendingCount === 1 ? 'operación pendiente' : 'operaciones pendientes'}
            </span>
          )}

          {lastSyncMessage && (
            <span className="text-emerald-400 font-medium truncate max-w-xs">{lastSyncMessage}</span>
          )}

          {isOnline && pendingCount > 0 && (
            <button
              onClick={handleSyncNow}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition shadow-sm active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
            </button>
          )}

          <button
            onClick={toggleSimulatedOffline}
            className="text-slate-400 hover:text-white underline text-[11px] ml-1"
          >
            {isSimulatedOffline ? 'Salir de modo offline' : 'Probar modo offline'}
          </button>
        </div>
      </div>
    </div>
  );
};
