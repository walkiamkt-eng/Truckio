import React, { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Trash2,
  X,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Radio,
  Zap,
} from 'lucide-react';
import {
  NotificationService,
  TRUCKIO_NOTIFICATIONS_CHANGED,
} from '../../services/notificationService.ts';
import type { User, NotificationItem } from '../../types/truckio.ts';

interface NotificationBellProps {
  currentUser: User;
  onNavigateToMaintenance?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  currentUser,
  onNavigateToMaintenance,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [permissionState, setPermissionState] = useState<NotificationPermission | 'unsupported'>('default');
  const [testPushStatus, setTestPushStatus] = useState<string | null>(null);

  const reload = () => {
    const list = NotificationService.getStoredNotifications(currentUser.id);
    setNotifications(list);
    if ('Notification' in window) {
      setPermissionState(Notification.permission);
    } else {
      setPermissionState('unsupported');
    }
  };

  const handleTestBackgroundPush = async () => {
    const status = await NotificationService.testBackgroundPushSimulation('AE 482 OK', 4);
    setTestPushStatus(status);
    setTimeout(() => setTestPushStatus(null), 8000);
  };

  useEffect(() => {
    reload();
    window.addEventListener(TRUCKIO_NOTIFICATIONS_CHANGED, reload);
    return () => window.removeEventListener(TRUCKIO_NOTIFICATIONS_CHANGED, reload);
  }, [currentUser.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRequestPermission = async () => {
    const result = await NotificationService.requestPermission();
    setPermissionState(result);
  };

  const handleMarkAsRead = (id: string) => {
    NotificationService.markAsRead(currentUser.id, id);
    reload();
  };

  const handleMarkAllRead = () => {
    NotificationService.markAllAsRead(currentUser.id);
    reload();
  };

  const handleClearAll = () => {
    NotificationService.clearAll(currentUser.id);
    reload();
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Notificaciones de mantenimiento"
        className="relative p-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-black text-white ring-2 ring-slate-900 animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-4 z-50 animate-in fade-in text-slate-100">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h4 className="font-bold text-sm text-white">Alertas de Mantenimiento</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  {unreadCount} nuevas
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  title="Borrar todas las notificaciones"
                  className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Browser Notification Banner Prompt if not granted */}
          {permissionState === 'default' && (
            <div className="mb-3 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs">
              <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
                <Bell className="w-4 h-4" />
                <span>¿Activar notificaciones en el teléfono?</span>
              </div>
              <p className="text-[11px] text-slate-300 mb-2 leading-relaxed">
                Recibe avisos inmediatos en tu pantalla cuando tu unidad se acerque a su service preventivo.
              </p>
              <button
                onClick={handleRequestPermission}
                className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition"
              >
                Permitir Notificaciones
              </button>
            </div>
          )}

          {/* Service Worker Push Control & Background Test */}
          <div className="mb-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-slate-300">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span>Service Worker Push</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Activo en 2do Plano
              </span>
            </div>

            <p className="text-slate-400 leading-snug">
              Las alertas críticas vibran y se muestran aunque la app esté en segundo plano o cerrada.
            </p>

            <button
              onClick={handleTestBackgroundPush}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Probar Alerta Push (en 4 seg)</span>
            </button>

            {testPushStatus && (
              <p className="text-[10px] text-amber-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20 leading-tight">
                {testPushStatus}
              </p>
            )}
          </div>

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-1">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
              <p className="font-semibold text-slate-400">Sin alertas pendientes</p>
              <p className="text-[11px]">Todos los planes de mantenimiento están en regla.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                    !item.read
                      ? item.type === 'maintenance_overdue'
                        ? 'bg-red-500/15 border-red-500/40 text-slate-200'
                        : 'bg-amber-500/15 border-amber-500/40 text-slate-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-1.5 font-bold text-white">
                      {item.type === 'maintenance_overdue' ? (
                        <AlertOctagon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      )}
                      <span className="line-clamp-1">{item.title}</span>
                    </div>
                    {!item.read && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <p className="text-[11px] leading-relaxed text-slate-300 mb-2">
                    {item.body}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5">
                    {item.remainingText && (
                      <span className="font-mono font-bold text-amber-400">
                        {item.remainingText}
                      </span>
                    )}
                    <span>{new Date(item.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom Footer Actions */}
          {notifications.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs">
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] text-slate-400 hover:text-white transition"
              >
                Marcar todas como leídas
              </button>

              {onNavigateToMaintenance && (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onNavigateToMaintenance();
                  }}
                  className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                >
                  <span>Registrar Odómetro</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
