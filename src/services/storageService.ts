import { supabase } from '../lib/supabase';
import {
  db,
  seedDatabaseIfEmpty,
  DEFAULT_TENANT_ID,
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
      return localUsers;
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('tenant_id', validTenantId);

      if (error || !data) {
        console.error('Error al obtener usuarios de Supabase:', error?.message);
        return [];
      }

      const mappedUsers: User[] = data.map((p) => ({
        id: p.id,
        tenant_id: p.tenant_id,
        email: p.email || '',
        full_name: p.full_name,
        role: p.role,
        phone: p.phone,
      }));

      await db.users.bulkPut(mappedUsers);
      return mappedUsers;
    } catch (err) {
      console.error('Excepción al cargar usuarios:', err);
      return [];
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
    newKm: number,
    driverUserId?: string,
    forceOverride = false
  ) {
    const currentVehicle = await this.getVehicleById(vehicleId);
    if (!currentVehicle) throw new Error('Vehículo no encontrado');

    const effectiveKm = forceOverride ? newKm : Math.max(currentVehicle.current_km || 0, newKm);

    const updatedVehicle = await this.updateVehicle(vehicleId, {
      current_km: effectiveKm,
    });

    if (isEffectivelyOffline()) {
      await this.enqueueOfflineAction('update_odometer', {
        vehicleId,
        newKm: effectiveKm,
        driverUserId,
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, vehicle: updatedVehicle, message: 'Kilometraje actualizado.' };
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

  public static async recordMaintenanceServiceDone(
    planId: string,
    serviceValue: number,
    serviceDate: string
  ): Promise<void> {
    if (isEffectivelyOffline()) {
      await this.init();
      const plan = await db.maintenance_plans.get(planId);
      if (!plan) throw new Error('Plan no encontrado');
      const updated = { ...plan, last_service_value: serviceValue, last_service_date: serviceDate };
      await db.maintenance_plans.put(updated);
      notifyStateChanged();
      return;
    }

    const { error } = await supabase
      .from('maintenance_plans')
      .update({ last_service_value: serviceValue, last_service_date: serviceDate })
      .eq('id', planId);

    if (error) throw new Error(error.message);
    notifyStateChanged();
  }

  // --- ISSUES (CORREGIDO CON MANEJO DIRECTO DE ERRORES DE SUPABASE) ---
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
        console.error('Error al obtener incidencias de Supabase:', error.message);
        await this.init();
        return await db.issues.where('tenant_id').equals(validTenantId).toArray();
      }

      if (data && data.length > 0) {
        await db.issues.bulkPut(data);
      }
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
      if (error) {
        console.error('Error de Supabase al insertar incidencia:', error.message);
        throw new Error(`Error en Supabase: ${error.message}`);
      }
      
      await db.issues.put(data);
      notifyStateChanged();
      return data;
    } catch (err: any) {
      console.error('Fallback a IndexedDB por error:', err);
      await this.init();
      await db.issues.put(normalizedIssue);
      notifyStateChanged();
      throw err; // Lanzar el error para ser advertidos en UI en caso de RLS u otro bloqueo
    }
  }

  public static async updateIssueStatus(
    issueId: string,
    status: string,
    details?: { assigned_workshop?: string; repair_cost?: number; repair_notes?: string }
  ): Promise<void> {
    const payload: any = { status, ...details };
    if (status === 'resolved') {
      payload.resolved_at = new Date().toISOString();
    }

    if (isEffectivelyOffline()) {
      await this.init();
      const issue = await db.issues.get(issueId);
      if (!issue) throw new Error('Incidencia no encontrada');
      const updated = { ...issue, ...payload };
      await db.issues.put(updated);
      notifyStateChanged();
      return;
    }

    const { error } = await supabase.from('issues').update(payload).eq('id', issueId);
    if (error) throw new Error(error.message);
    notifyStateChanged();
  }

  // --- CÁLCULO DE SALUD DE VEHÍCULO ---
  public static calculateVehicleHealth(
    vehicle: Vehicle,
    plans: MaintenancePlan[] = [],
    issues: Issue[] = []
  ): { status: 'green' | 'yellow' | 'red'; score: number; reason: string; minRemainingPercentage: number } {
    const vehicleIssues = issues.filter(
      (i) => i.vehicle_id === vehicle.id && i.status !== 'resolved' && i.status !== 'closed'
    );

    const hasCriticalIssue = vehicleIssues.some((i) => i.severity === 'critical' || i.severity === 'high');
    if (hasCriticalIssue) {
      return {
        status: 'red',
        score: 40,
        reason: 'Tiene incidencias críticas o de alta prioridad pendientes',
        minRemainingPercentage: 0,
      };
    }

    const vehiclePlans = plans.filter((p) => p.vehicle_id === vehicle.id);
    const currentKm = vehicle.current_km || 0;

    if (vehiclePlans.length === 0) {
      return {
        status: 'green',
        score: 100,
        reason: 'Vehículo activo sin planes preventivos restrictivos configurados',
        minRemainingPercentage: 100,
      };
    }

    let lowestPercent = 100;
    let hasOverdue = false;
    let hasWarning = false;

    vehiclePlans.forEach((plan) => {
      const nextDue = (plan.last_service_value || 0) + (plan.target_value || 0);
      const remaining = nextDue - currentKm;
      const percent = plan.target_value > 0 ? Math.round((remaining / plan.target_value) * 100) : 100;

      if (percent < lowestPercent) {
        lowestPercent = percent;
      }

      if (remaining <= 0) {
        hasOverdue = true;
      } else if (percent <= 15) {
        hasWarning = true;
      }
    });

    if (hasOverdue) {
      return {
        status: 'red',
        score: 50,
        reason: 'Mantenimiento preventivo vencido',
        minRemainingPercentage: Math.max(0, lowestPercent),
      };
    }

    if (hasWarning) {
      return {
        status: 'yellow',
        score: 75,
        reason: 'Mantenimiento preventivo próximo a vencer (≤15%)',
        minRemainingPercentage: lowestPercent,
      };
    }

    return {
      status: 'green',
      score: 100,
      reason: 'Todos los mantenimientos preventivos en regla',
      minRemainingPercentage: lowestPercent,
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