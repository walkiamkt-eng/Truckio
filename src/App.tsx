/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/common/Header';
import { OfflineBanner } from './components/common/OfflineBanner';
import { DriverView } from './components/driver/DriverView';
import { FleetDashboard } from './components/fleet/FleetDashboard';
import { IncidentBoard } from './components/fleet/IncidentBoard';
import { PlansManager } from './components/fleet/PlansManager';
import { FleetReportPDFModal } from './components/fleet/FleetReportPDFModal';
import { LoginView } from './components/auth/LoginView';
import { UserManagementView } from './components/users/UserManagementView';
import { DispatchView } from './components/dispatch/DispatchView';
import { AuthService } from './services/authService';
import { StorageService, TRUCKIO_STATE_CHANGED } from './services/storageService';
import { NotificationService } from './services/notificationService';
import { INITIAL_USERS } from './db/indexedDB';
import { supabase } from './lib/supabase';
import type {
  User,
  Vehicle,
  MaintenancePlan,
  Issue,
  VehicleMaintenanceHealth,
} from './types/truckio';
import { Loader2, Truck, Building2, User as UserIcon, Mail, Lock, Ticket, ArrowRight, ShieldCheck } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, VehicleMaintenanceHealth>>({});
  const [activeTab, setActiveTab] = useState<string>('driver_hub');
  const [globalPdfModalOpen, setGlobalPdfModalOpen] = useState(false);

  // Estado para alternar entre Login y Registro de Empresa (SaaS)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Estado para el formulario de Registro SaaS con Código Promo
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    companyName: '',
    email: '',
    password: '',
    promoCode: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);

  // Verificación de sesión Supabase
  const checkSession = useCallback(async () => {
    try {
      const user = await AuthService.getCurrentProfile();
      setCurrentUser(user);
      if (user) {
        if (user.role === 'driver') {
          setActiveTab('driver_hub');
        } else if (activeTab === 'driver_hub') {
          setActiveTab('fleet_health');
        }
      }
    } catch (error) {
      console.error('Error al verificar sesión:', error);
      setCurrentUser(null);
    }
  }, [activeTab]);

  const loadData = useCallback(async () => {
    if (!currentUser) return;

    try {
      await StorageService.init();
      const tenantId = currentUser.tenant_id;

      const [u, v, p, i] = await Promise.all([
        StorageService.getUsers(tenantId),
        StorageService.getVehicles(tenantId),
        StorageService.getMaintenancePlans(tenantId),
        StorageService.getIssues(tenantId),
      ]);

      if (Array.isArray(u) && u.length > 0) {
        setUsers(u);
      } else {
        setUsers([currentUser]);
      }

      setVehicles(v || []);
      setPlans(p || []);
      setIssues(i || []);

      // Calcular semáforo de salud para los vehículos de la empresa
      if (Array.isArray(v) && v.length > 0) {
        const healthPromises = v.map(async (veh) => {
          const h = await StorageService.calculateVehicleHealth(veh, p || [], i || []);
          return { id: veh.id, health: h };
        });
        const healthResults = await Promise.all(healthPromises);
        const hMap: Record<string, VehicleMaintenanceHealth> = {};
        healthResults.forEach((res) => {
          hMap[res.id] = res.health;
        });
        setHealthMap(hMap);
      }

      // Notificaciones para chofer
      if (currentUser.role === 'driver') {
        NotificationService.checkDriverMaintenanceAlerts(currentUser, v || [], p || []);
      }
    } catch (err) {
      console.error('Error cargando datos de Truckio:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Carga inicial y escucha en tiempo real de cambios de sesión en Supabase
  useEffect(() => {
    let isMounted = true;

    const initSession = async () => {
      setLoading(true);
      await checkSession();
      if (isMounted) {
        setLoading(false);
      }
    };

    initSession();

    // Suscripción a cambios de autenticación (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await checkSession();
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          setCurrentUser(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [checkSession]);

  // Carga de datos cuando el usuario está autenticado y manejo de eventos online / sync
  useEffect(() => {
    if (currentUser) {
      loadData();
    }

    const handleSyncAndReload = async () => {
      if (!StorageService.isEffectivelyOffline()) {
        await StorageService.syncPendingQueue();
      }
      if (currentUser) {
        loadData();
      }
    };

    window.addEventListener('online', handleSyncAndReload);
    window.addEventListener(TRUCKIO_STATE_CHANGED, handleSyncAndReload);

    return () => {
      window.removeEventListener('online', handleSyncAndReload);
      window.removeEventListener(TRUCKIO_STATE_CHANGED, handleSyncAndReload);
    };
  }, [currentUser, loadData]);

  const handleLogout = async () => {
    await AuthService.signOut();
    setCurrentUser(null);
  };

  // Manejador del Registro SaaS de Administrador + Empresa + Código Promo
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    setRegisterLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email: registerForm.email.trim(),
        password: registerForm.password,
        options: {
          data: {
            full_name: registerForm.fullName.trim(),
            company_name: registerForm.companyName.trim(),
            promo_code: registerForm.promoCode.trim().toUpperCase(),
          },
        },
      });

      if (error) {
        throw error;
      }

      setRegisterSuccess(
        '¡Registro exitoso! Tu empresa ha sido creada con la membresía activa.'
      );

      // Limpiar formulario y verificar sesión automáticamente
      setTimeout(async () => {
        await checkSession();
      }, 1500);
    } catch (err: any) {
      console.error('Error en el registro:', err);
      setRegisterError(
        err.message || 'No se pudo completar el registro. Verifica los datos.'
      );
    } finally {
      setRegisterLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
        <h2 className="text-lg font-bold font-mono tracking-wider text-white">TRUCKIO FLEET OS</h2>
        <p className="text-xs text-slate-400 mt-1">Verificando credenciales de acceso...</p>
      </div>
    );
  }

  // Si no hay sesión iniciada, mostramos la pantalla de Autenticación (Login o Registro SaaS)
  if (!currentUser) {
    if (authMode === 'register') {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            {/* Adorno superior */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3 text-amber-400">
                <Truck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold font-mono text-white tracking-wide">
                TRUCKIO FLEET OS
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Registro de Nueva Empresa de Transporte (SaaS)
              </p>
            </div>

            {registerError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <span>⚠️ {registerError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>{registerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre Completo (Administrador)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={registerForm.fullName}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, fullName: e.target.value })
                    }
                    placeholder="Ej. Carlos Gómez"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nombre de la Empresa de Transporte
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={registerForm.companyName}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, companyName: e.target.value })
                    }
                    placeholder="Ej. Transporte Expreso S.A."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={registerForm.email}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, email: e.target.value })
                    }
                    placeholder="admin@empresa.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={registerForm.password}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, password: e.target.value })
                    }
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-amber-400 mb-1 flex items-center justify-between">
                  <span>Código Promocional / Cortesía</span>
                  <span className="text-[10px] text-slate-500">Opcional</span>
                </label>
                <div className="relative">
                  <Ticket className="w-4 h-4 absolute left-3 top-3 text-amber-500" />
                  <input
                    type="text"
                    value={registerForm.promoCode}
                    onChange={(e) =>
                      setRegisterForm({ ...registerForm, promoCode: e.target.value })
                    }
                    placeholder="Ej. PILOTO6M"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-amber-500/40 rounded-xl text-sm text-amber-300 placeholder-slate-600 uppercase tracking-widest font-mono focus:outline-none focus:border-amber-400 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={registerLoading}
                className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/10 disabled:opacity-50"
              >
                {registerLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Registrar Empresa y Comenzar</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <p className="text-xs text-slate-400">
                ¿Ya tienes una cuenta registrada?{' '}
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-amber-400 hover:underline font-medium ml-1"
                >
                  Iniciar Sesión
                </button>
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <LoginView onLoginSuccess={checkSession} />
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setAuthMode('register')}
            className="px-4 py-2 bg-slate-900 border border-amber-500/30 text-amber-400 text-xs font-semibold rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" />
            <span>¿Nueva Empresa? Registra tu Flota</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Banner de Estado Offline */}
      <OfflineBanner />

      {/* Header Principal con Datos del Usuario Autenticado */}
      <Header
        currentUser={currentUser}
        availableUsers={users.length > 0 ? users : [currentUser]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onLogout={handleLogout}
        onOpenFleetPdf={() => setGlobalPdfModalOpen(true)}
      />

      {/* Área Principal */}
      <main className="flex-1 pb-16">
        {currentUser.role === 'driver' ? (
          <>
            {activeTab === 'driver_hub' && (
              <DriverView
                currentUser={currentUser}
                vehicles={vehicles}
                plans={plans}
                issues={issues}
                healthMap={healthMap}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'driver_issues' && (
              <div className="max-w-4xl mx-auto px-4 py-6">
                <IncidentBoard
                  issues={issues.filter(
                    (i) =>
                      i.reported_by_user_id === currentUser.id ||
                      (i as any).reported_by === currentUser.id ||
                      (i as any).reporter_id === currentUser.id ||
                      i.vehicle_id === currentUser.assigned_vehicle_id
                  )}
                  vehicles={vehicles}
                  users={users}
                  onRefresh={loadData}
                />
              </div>
            )}
          </>
        ) : (
          <>
            {(activeTab === 'fleet_health' || activeTab === 'fleet_vehicles') && (
              <FleetDashboard
                currentUser={currentUser}
                vehicles={vehicles}
                plans={plans}
                issues={issues}
                healthMap={healthMap}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'dispatch' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <DispatchView
                  currentUser={currentUser}
                  vehicles={vehicles}
                  users={users}
                />
              </div>
            )}
            {activeTab === 'fleet_issues' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <IncidentBoard
                  issues={issues}
                  vehicles={vehicles}
                  users={users}
                  onRefresh={loadData}
                />
              </div>
            )}
            {activeTab === 'fleet_plans' && (
              <PlansManager
                vehicles={vehicles}
                plans={plans}
                currentUser={currentUser}
                onRefresh={loadData}
              />
            )}
            {activeTab === 'users' && (
              <UserManagementView currentUser={currentUser} />
            )}
          </>
        )}
      </main>

      {/* Modal para Generar Informe PDF */}
      {globalPdfModalOpen && (
        <FleetReportPDFModal
          vehicles={vehicles}
          plans={plans}
          issues={issues}
          healthMap={healthMap}
          onClose={() => setGlobalPdfModalOpen(false)}
        />
      )}
    </div>
  );
}