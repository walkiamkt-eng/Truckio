/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/common/Header.tsx';
import { OfflineBanner } from './components/common/OfflineBanner.tsx';
import { DriverView } from './components/driver/DriverView.tsx';
import { FleetDashboard } from './components/fleet/FleetDashboard.tsx';
import { IncidentBoard } from './components/fleet/IncidentBoard.tsx';
import { PlansManager } from './components/fleet/PlansManager.tsx';
import { FleetReportPDFModal } from './components/fleet/FleetReportPDFModal.tsx';
import { StorageService, TRUCKIO_STATE_CHANGED } from './services/storageService.ts';
import { NotificationService } from './services/notificationService.ts';
import { INITIAL_USERS } from './db/indexedDB.ts';
import type {
  User,
  Vehicle,
  MaintenancePlan,
  Issue,
  VehicleMaintenanceHealth,
} from './types/truckio.ts';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]); // Starts as Driver Carlos Gutiérrez
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [healthMap, setHealthMap] = useState<Record<string, VehicleMaintenanceHealth>>({});
  const [activeTab, setActiveTab] = useState<string>('driver_hub');
  const [globalPdfModalOpen, setGlobalPdfModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await StorageService.init();
      const [u, v, p, i] = await Promise.all([
        StorageService.getUsers(),
        StorageService.getVehicles(),
        StorageService.getMaintenancePlans(),
        StorageService.getIssues(),
      ]);

      // Aseguramos que siempre haya al menos los usuarios iniciales de demostración
      if (Array.isArray(u) && u.length >= 2) {
        setUsers(u);
      } else {
        setUsers(INITIAL_USERS);
      }

      setVehicles(v || []);
      setPlans(p || []);
      setIssues(i || []);

      // Compute semaphoric health for all vehicles
      if (Array.isArray(v) && v.length > 0) {
        const healthPromises = v.map(async (veh) => {
          const h = await StorageService.calculateVehicleHealth(veh);
          return { id: veh.id, health: h };
        });
        const healthResults = await Promise.all(healthPromises);
        const hMap: Record<string, VehicleMaintenanceHealth> = {};
        healthResults.forEach((res) => {
          hMap[res.id] = res.health;
        });
        setHealthMap(hMap);
      }

      // Check driver local notifications
      if (currentUser.role === 'driver') {
        NotificationService.checkDriverMaintenanceAlerts(currentUser, v || [], p || []);
      }
    } catch (err) {
      console.error('Error loading Truckio data:', err);
      // Fallback seguro en caso de error
      setUsers(INITIAL_USERS);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Listener para carga inicial, reconexión de red y sincronización de eventos de la app
  useEffect(() => {
    loadData();

    const handleSyncAndReload = async () => {
      if (!StorageService.isEffectivelyOffline()) {
        await StorageService.syncPendingQueue();
      }
      loadData();
    };

    window.addEventListener('online', handleSyncAndReload);
    window.addEventListener(TRUCKIO_STATE_CHANGED, handleSyncAndReload);

    return () => {
      window.removeEventListener('online', handleSyncAndReload);
      window.removeEventListener(TRUCKIO_STATE_CHANGED, handleSyncAndReload);
    };
  }, [loadData]);

  // Re-check alerts when user changes
  useEffect(() => {
    if (currentUser.role === 'driver' && vehicles.length > 0 && plans.length > 0) {
      NotificationService.checkDriverMaintenanceAlerts(currentUser, vehicles, plans);
    }
  }, [currentUser, vehicles, plans]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mb-4">
          <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
        </div>
        <h2 className="text-lg font-bold font-mono tracking-wider text-white">TRUCKIO FLEET OS</h2>
        <p className="text-xs text-slate-400 mt-1">Cargando base de datos IndexedDB local...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Offline Status & Background Sync Queue Banner */}
      <OfflineBanner />

      {/* Main Header & Role Switcher */}
      <Header
        currentUser={currentUser}
        onUserChange={(newUser) => {
          setCurrentUser(newUser);
          if (newUser.role === 'driver') {
            setActiveTab('driver_hub');
          } else {
            setActiveTab('fleet_health');
          }
        }}
        availableUsers={users.length > 0 ? users : INITIAL_USERS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenFleetPdf={() => setGlobalPdfModalOpen(true)}
      />

      {/* Main View Area */}
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
          </>
        )}
      </main>

      {/* Global Fleet Report PDF Modal */}
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