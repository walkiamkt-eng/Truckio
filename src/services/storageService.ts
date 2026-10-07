import { supabase } from '../lib/supabase';
import {
  db,
  seedDatabaseIfEmpty,
  DEFAULT_TENANT_ID,
  INITIAL_USERS,
} from '../db/indexedDB.ts';
import type {
  Vehicle,
  MaintenancePlan,
  Issue,
  User,
  OfflineQueueItem,
} from '../types/truckio.ts';
import { SyncService } from './syncService';

export const TRUCKIO_STATE_CHANGED = 'truckio_state_changed';
export function notifyStateChanged() {
  window.dispatchEvent(new CustomEvent(TRUCKIO_STATE_CHANGED));
}

const SIMULATED_OFFLINE_KEY = 'truckio_simulated_offline';

export function getSimulatedOffline(): boolean {
  return localStorage.getItem(SIMULATED_OFFLINE_KEY) === 'true';
}

export function setSimulatedOffline(isOffline: boolean) {
  localStorage.setItem(SIMULATED_OFFLINE_KEY, isOffline ? 'true' : 'false');
  notifyStateChanged();
}

export function isEffectivelyOffline(): boolean {
  if (getSimulatedOffline()) return true;
  return typeof navigator !== 'undefined' ? !navigator.onLine : false;
}

export class StorageService {
  public static async init(): Promise<void> {
    try {
      await seedDatabaseIfEmpty();
    } catch (error) {
      console.error('Error al inicializar la base de datos local:', error);
    }
  }

  public static async resetToDefault(): Promise<void> {
    await db.clearAllTables();
    await seedDatabaseIfEmpty();
    notifyStateChanged();
  }

  public static async syncPendingQueue(): Promise<void> {
    await SyncService.processQueue();
  }

  public static async getAdminEventsFeed(): Promise<Issue[]> {
    if (isEffectivelyOffline()) {
      await this.init();
      return await db.issues.toArray();
    }

    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        await this.init();
        return await db.issues.toArray();
      }

      if (data && data.length > 0) {
        await db.issues.bulkPut(data);
      }
      return data || [];
    } catch {
      await this.init();
      return await db.issues.toArray();
    }
  }

  public static async assignTrip(dispatchData: {
    driverUserId: string;
    truckId: string;
    trailerId: string;
    startOdometer: number;
  }): Promise<void> {
    const payload = {
      ...dispatchData,
      assigned_at: new Date().toISOString(),
      status: 'active',
    };

    if (isEffectivelyOffline()) {
      await SyncService.enqueueAction('ASSIGN_TRIP', payload);
      notifyStateChanged();
      return;
    }

    const { error } = await supabase.from('trip_assignments').insert([payload]);
    if (error) throw new Error(error.message);

    notifyStateChanged();
  }

  // --- USERS ---
  public static async getUsers(tenantId?: string): Promise<User[]> {
    const validTenantId = tenantId && tenantId.length === 36 ? tenantId : DEFAULT_TENANT_ID;
    if (isEffectivelyOffline()) {
      await this.init();
      const localUsers = await db.users.where('tenant_id').equals(validTenantId).toArray();
      return localUsers.length > 0 ? localUsers : INITIAL_USERS;
    }
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('tenant_id', validTenantId);
      if (error || !data || data.length === 0) {
        await this.init();
        const localUsers = await db.users.where('tenant_id').equals(validTenantId).toArray();
        return localUsers.length > 0 ? localUsers : INITIAL_USERS;
      }
      const mappedUsers: User[] = data.map((p) => ({
        id: p.id,
        tenant_id: p.tenant_id,
        email: p.email || '',
        full_name: p.full_name,
        role: p.role,
      }));
      await db.users.bulkPut(mappedUsers);
      return mappedUsers;
    } catch {
      await this.init();
      const localUsers = await db.users.where('tenant_id').equals(validTenantId).toArray();
      return localUsers.length > 0 ? localUsers : INITIAL_USERS;
    }
  }

  // --- VEHICLES ---
  public static async getVehicles(tenantId?: string): Promise<Vehicle[]> {
    const validTenantId = tenantId && tenantId.length === 36 ? tenantId : DEFAULT_TENANT_ID;
    if (isEffectivelyOffline()) {
      await this.init();
      return await db.vehicles.where('tenant_id').equals(validTenantId).toArray();
    }
    try {
      const { data, error } = await supabase.from('vehicles').select('*').eq('tenant_id', validTenantId);
      if (error) {
        await this.init();
        return await db.vehicles.where('tenant_id').equals(validTenantId).toArray();
      }
      if (data && data.length > 0) await db.vehicles.bulkPut(data);
      return data || [];
    } catch {
      await this.init();
      return await db.vehicles.where('tenant_id').equals(validTenantId).toArray();
    }
  }

  public static async getVehicleById(id: string): Promise<Vehicle | undefined> {
    if (isEffectivelyOffline()) {
      await this.init();
      return await db.vehicles.get(id);
    }
    try {
      const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        await this.init();
        return await db.vehicles.get(id);
      }
      return data;
    } catch {
      await this.init();
      return await db.vehicles.get(id);
    }
  }

  public static async createVehicle(vehicleData: Omit<Vehicle, 'id' | 'created_at'>): Promise<Vehicle> {
    const validTenantId = vehicleData.tenant_id && vehicleData.tenant_id.length === 36 ? vehicleData.tenant_id : DEFAULT_TENANT_ID;
    const payload = { ...vehicleData, tenant_id: validTenantId };

    if (isEffectivelyOffline()) {
      await this.init();
      const newVehicle: Vehicle = {
        ...vehicleData,
        tenant_id: validTenantId,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      await SyncService.enqueueAction('CREATE_VEHICLE', newVehicle);
      await db.vehicles.put(newVehicle);
      notifyStateChanged();
      return newVehicle;
    }

    const { data, error } = await supabase.from('vehicles').insert([payload]).select().single();
    if (error) throw new Error(error.message);

    await db.vehicles.put(data);
    notifyStateChanged();
    return data;
  }

  public static async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle> {
    if (isEffectivelyOffline()) {
      await this.init();
      const vehicle = await db.vehicles.get(id);
      if (!vehicle) throw new Error('Vehículo no encontrado');
      const updated = { ...vehicle, ...updates };
      await db.vehicles.put(updated);
      notifyStateChanged();
      return updated;
    }
    const { data, error } = await supabase.from('vehicles').update(updates).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    await db.vehicles.put(data);
    notifyStateChanged();
    return data;
  }

  public static async updateOdometerAndHours(
    vehicleId: string,
    newMileage: number,
    newHours: number,
    driverUserId?: string,
    forceOverride = false
  ) {
    const currentVehicle = await this.getVehicleById(vehicleId);
    if (!currentVehicle) throw new Error('Vehículo no encontrado');

    const effectiveMileage = forceOverride ? newMileage : Math.max(currentVehicle.current_mileage, newMileage);
    const effectiveHours = forceOverride ? newHours : Math.max(currentVehicle.current_engine_hours, newHours);

    const updatedVehicle = await this.updateVehicle(vehicleId, {
      current_mileage: effectiveMileage,
      current_engine_hours: effectiveHours,
    });

    if (isEffectivelyOffline()) {
      await this.enqueueOfflineAction('update_odometer', {
        vehicleId,
        newMileage: effectiveMileage,
        newHours: effectiveHours,
        driverUserId,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, vehicle: updatedVehicle, message: 'Odómetro actualizado.' };
  }

  // --- MAINTENANCE PLANS ---
  public static async getMaintenancePlans(tenantId?: string): Promise<MaintenancePlan[]> {
    const validTenantId = tenantId && tenantId.length === 36 ? tenantId : DEFAULT_TENANT_ID;
    if (isEffectivelyOffline()) {
      await this.init();
      return await db.maintenance_plans.where('tenant_id').equals(validTenantId).toArray();
    }
    try {
      const { data, error } = await supabase.from('maintenance_plans').select('*').eq('tenant_id', validTenantId);
      if (error) {
        await this.init();
        return await db.maintenance_plans.where('tenant_id').equals(validTenantId).toArray();
      }
      if (data && data.length > 0) await db.maintenance_plans.bulkPut(data);
      return data || [];
    } catch {
      await this.init();
      return await db.maintenance_plans.where('tenant_id').equals(validTenantId).toArray();
    }
  }

  public static async getPlansByVehicle(vehicleId: string): Promise<MaintenancePlan[]> {
    if (isEffectivelyOffline()) {
      await this.init();
      return await db.maintenance_plans.where('vehicle_id').equals(vehicleId).toArray();
    }
    try {
      const { data, error } = await supabase.from('maintenance_plans').select('*').eq('vehicle_id', vehicleId);
      if (error) {
        await this.init();
        return await db.maintenance_plans.where('vehicle_id').equals(vehicleId).toArray();
      }
      return data || [];
    } catch {
      await this.init();
      return await db.maintenance_plans.where('vehicle_id').equals(vehicleId).toArray();
    }
  }

  public static async createMaintenancePlan(planData: Omit<MaintenancePlan, 'id' | 'created_at'>): Promise<MaintenancePlan> {
    const validTenantId = planData.tenant_id && planData.tenant_id.length === 36 ? planData.tenant_id : DEFAULT_TENANT_ID;
    const payload = { ...planData, tenant_id: validTenantId };
    if (isEffectivelyOffline()) {
      await this.init();
      const newPlan: MaintenancePlan = { ...planData, tenant_id: validTenantId, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      await this.enqueueOfflineAction('create_maintenance_plan', newPlan);
      await db.maintenance_plans.put(newPlan);
      notifyStateChanged();
      return newPlan;
    }
    const { data, error } = await supabase.from('maintenance_plans').insert([payload]).select().single();
    if (error) throw new Error(error.message);
    await db.maintenance_plans.put(data);
    notifyStateChanged();
    return data;
  }

  // --- ISSUES ---
  public static async getIssues(tenantId?: string): Promise<Issue[]> {
    const validTenantId = tenantId && tenantId.length === 36 ? tenantId : DEFAULT_TENANT_ID;
    if (isEffectivelyOffline()) {
      await this.init();
      return await db.issues.where('tenant_id').equals(validTenantId).toArray();
    }
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .eq('tenant_id', validTenantId)
        .order('created_at', { ascending: false });
      if (error) {
        await this.init();
        return await db.issues.where('tenant_id').equals(validTenantId).toArray();
      }
      if (data && data.length > 0) await db.issues.bulkPut(data);
      return data || [];
    } catch {
      await this.init();
      return await db.issues.where('tenant_id').equals(validTenantId).toArray();
    }
  }

  public static async createIssue(issueData: Omit<Issue, 'id' | 'created_at'>): Promise<Issue> {
    const validTenantId = issueData.tenant_id && issueData.tenant_id.length === 36 ? issueData.tenant_id : DEFAULT_TENANT_ID;
    const generatedId = crypto.randomUUID();
    const normalizedIssue: Issue = {
      ...issueData,
      id: generatedId,
      tenant_id: validTenantId,
      created_at: new Date().toISOString(),
    } as Issue;

    if (isEffectivelyOffline()) {
      await this.init();
      await SyncService.enqueueAction('CREATE_ISSUE', normalizedIssue);
      await db.issues.put(normalizedIssue);
      notifyStateChanged();
      return normalizedIssue;
    }

    try {
      const { data, error } = await supabase.from('issues').insert([normalizedIssue]).select().single();
      if (error) throw error;
      await db.issues.put(data);
      notifyStateChanged();
      return data;
    } catch {
      await this.init();
      await SyncService.enqueueAction('CREATE_ISSUE', normalizedIssue);
      await db.issues.put(normalizedIssue);
      notifyStateChanged();
      return normalizedIssue;
    }
  }

  // --- CÁLCULO DE SALUD DE VEHÍCULO ---
  public static calculateVehicleHealth(
    vehicle: Vehicle,
    plans: MaintenancePlan[] = [],
    issues: Issue[] = []
  ): { status: 'OK' | 'WARNING' | 'CRITICAL'; score: number; reason: string } {
    const vehicleIssues = issues.filter(
      (i) => i.vehicle_id === vehicle.id && i.status !== 'resolved' && i.status !== 'closed'
    );

    const hasCriticalIssue = vehicleIssues.some((i) => i.severity === 'critical' || i.severity === 'high');
    if (hasCriticalIssue) {
      return {
        status: 'CRITICAL',
        score: 40,
        reason: 'Tiene incidencias críticas o de alta prioridad pendientes',
      };
    }

    const vehiclePlans = plans.filter((p) => p.vehicle_id === vehicle.id);
    const hasOverduePlan = vehiclePlans.some((plan) => {
      const isMileageOverdue =
        plan.next_service_mileage && vehicle.current_mileage >= plan.next_service_mileage;
      const isDateOverdue =
        plan.next_service_date && new Date(plan.next_service_date) <= new Date();
      return isMileageOverdue || isDateOverdue;
    });

    if (hasOverduePlan) {
      return {
        status: 'WARNING',
        score: 70,
        reason: 'Mantenimiento preventivo vencido o próximo a vencer',
      };
    }

    if (vehicleIssues.length > 0) {
      return {
        status: 'WARNING',
        score: 80,
        reason: 'Tiene incidencias menores reportadas',
      };
    }

    return {
      status: 'OK',
      score: 100,
      reason: 'Vehículo en óptimas condiciones',
    };
  }

  private static async enqueueOfflineAction(type: OfflineQueueItem['type'], payload: any) {
    const item: OfflineQueueItem = {
      id: crypto.randomUUID(),
      type,
      payload,
      created_at: new Date().toISOString(),
      retries: 0,
    };
    await db.offline_queue.put(item);
  }
}