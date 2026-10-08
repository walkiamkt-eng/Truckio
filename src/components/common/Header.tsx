import React, { useState, useEffect, useRef } from 'react';
import { Truck, Wifi, WifiOff, RotateCcw, ChevronDown, Check, FileText, Users, Navigation } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { NotificationBell } from './NotificationBell';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { StorageService } from '../../services/storageService';
import type { User, UserRole } from '../../types/truckio';

interface HeaderProps {
  currentUser: User;
  onUserChange?: (user: User) => void;
  availableUsers: User[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  onLogout?: () => void;
  onOpenFleetPdf?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  availableUsers,
  activeTab,
  onTabChange,
  onLogout,
  onOpenFleetPdf,
}) => {
  const { isOnline, toggleSimulatedOffline } = useOnlineStatus();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [vehiclesCount, setVehiclesCount] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const loadVehiclesCount = async () => {
      try {
        const vehicles = await StorageService.getVehicles();
        if (isMounted && Array.isArray(vehicles)) {
          setVehiclesCount(vehicles.length);
        }
      } catch (error) {
        console.error('Error al cargar vehículos:', error);
      }
    };
    loadVehiclesCount();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleResetData = async () => {
    if (confirm('¿Restablecer datos de flota a valores iniciales?')) {
      setResetting(true);
      try {
        await StorageService.resetToDefault();
        const vehicles = await StorageService.getVehicles();
        if (Array.isArray(vehicles)) setVehiclesCount(vehicles.length);
        window.location.reload();
      } finally {
        setResetting(false);
      }
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'driver':
        return 'Chofer en Ruta';
      case 'fleet_manager':
        return 'Gestor de Flota';
      case 'admin':
        return 'Administrador';
    }
  };

  const getUserDisplayName = (u: User) => {
    return u.full_name || (u as any).name || 'Usuario';
  };

  const filteredUsers = availableUsers.filter((u) => {
    if (currentUser?.role === 'driver') {
      return u.role === 'driver';
    }
    return u.role === 'fleet_manager' || u.role === 'admin';
  });

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white font-mono">
                  TRUCK<span className="text-amber-400">IO</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline-block">
                  PWA Fleet OS
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[160px] sm:max-w-xs">
                Transportes Aconcagua S.A.
              </p>
            </div>
          </div>

          {/* NAVEGACIÓN PRINCIPAL */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            {currentUser?.role === 'driver' ? (
              <>
                <button
                  onClick={() => onTabChange('driver_hub')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'driver_hub'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  🚚 Operación en Ruta
                </button>
                <button
                  onClick={() => onTabChange('driver_issues')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'driver_issues'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  ⚠️ Mis Incidencias
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onTabChange('fleet_health')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'fleet_health'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  🚦 Semáforo de Flota
                </button>
                <button
                  onClick={() => onTabChange('dispatch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'dispatch'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Despacho</span>
                </button>
                <button
                  onClick={() => onTabChange('fleet_issues')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'fleet_issues'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  🛠️ Flujo de Incidencias
                </button>
                <button
                  onClick={() => onTabChange('fleet_vehicles')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'fleet_vehicles'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  🚛 Vehículos ({vehiclesCount})
                </button>
                <button
                  onClick={() => onTabChange('fleet_plans')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    activeTab === 'fleet_plans'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  📋 Planes Preventivos
                </button>
                {/* Pestaña Personal / Usuarios para Admin o Gerente */}
                {(currentUser?.role === 'admin' || currentUser?.role === 'fleet_manager') && (
                  <button
                    onClick={() => onTabChange('users')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeTab === 'users'
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Personal</span>
                  </button>
                )}
              </>
            )}
          </nav>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSimulatedOffline}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
                !isOnline
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              {!isOnline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden sm:inline">{!isOnline ? 'Offline' : 'Online'}</span>
            </button>

            {currentUser?.role !== 'driver' && onOpenFleetPdf && (
              <button
                onClick={onOpenFleetPdf}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm transition active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Informe PDF</span>
              </button>
            )}

            <PWAInstallButton compact />

            <NotificationBell
              currentUser={currentUser}
              onNavigateToMaintenance={() => onTabChange(currentUser?.role === 'driver' ? 'driver_hub' : 'fleet_health')}
            />

            <button
              onClick={handleResetData}
              disabled={resetting}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              title="Restablecer datos"
            >
              <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin' : ''}`} />
            </button>

            {/* Dropdown de Usuario / Salir */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium transition active:scale-95"
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                  currentUser?.role === 'driver'
                    ? 'bg-blue-600 text-white'
                    : currentUser?.role === 'fleet_manager'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-600 text-white'
                }`}>
                  {getUserDisplayName(currentUser).charAt(0)}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="font-semibold text-white leading-tight truncate max-w-[120px]">
                    {getUserDisplayName(currentUser)}
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {getRoleLabel(currentUser?.role)}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 animate-in fade-in">
                  <div className="px-3 py-2 border-b border-slate-800 mb-1">
                    <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">
                      Perfil de Usuario
                    </p>
                  </div>
                  <div className="space-y-1">
                    {filteredUsers.map((u) => {
                      const isSelected = u.id === currentUser?.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            if (onUserChange) onUserChange(u);
                            setShowUserDropdown(false);
                            if (u.role === 'driver') {
                              onTabChange('driver_hub');
                            } else {
                              onTabChange('fleet_health');
                            }
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-left text-xs transition ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {u.role === 'driver' ? '🚚' : u.role === 'fleet_manager' ? '📊' : '⚙️'}
                            </span>
                            <div>
                              <div className="font-semibold">{getUserDisplayName(u)}</div>
                              <div className="text-[10px] text-slate-400">{getRoleLabel(u.role)}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      );
                    })}

                    {onLogout && (
                      <div className="pt-2 border-t border-slate-800 mt-1">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            onLogout();
                          }}
                          className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
                        >
                          🚪 Cerrar Sesión
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};