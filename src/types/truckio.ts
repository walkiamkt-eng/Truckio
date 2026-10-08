export type UserRole = 'driver' | 'fleet_manager' | 'admin';
export type VehicleType = 'truck' | 'trailer';
export type MaintenanceTriggerType = 'mileage' | 'engine_hours' | 'time_interval';
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical';
export type MobilityStatus = 'stopped' | 'running';
export type IssueStatus = 'reported' | 'under_review' | 'in_workshop' | 'resolved';

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  assigned_vehicle_id?: string;
  created_at: string;
}

export type AssetStatus = 'available' | 'assigned' | 'maintenance';

export interface Vehicle {
  id: string;
  tenant_id: string;
  license_plate: string;
  type?: VehicleType;
  brand: string;
  model: string;
  year?: number;
  vin?: string;
  current_mileage: number;
  current_engine_hours: number;
  is_active: boolean;
  status?: AssetStatus;
  notes?: string;
  created_at: string;
}

export interface Trailer {
  id: string;
  tenant_id: string;
  plate: string;
  type?: string;
  status: AssetStatus;
  created_at?: string;
}

export type AssignmentStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Assignment {
  id: string;
  tenant_id: string;
  driver_id: string;
  vehicle_id: string;
  trailer_id?: string | null;
  origin?: string;
  destination?: string;
  notes?: string;
  status: AssignmentStatus;
  start_time?: string;
  end_time?: string;
  created_at?: string;
  
  // Campos populados (joins)
  driver_name?: string;
  vehicle_plate?: string;
  trailer_plate?: string;
}

export interface MaintenancePlan {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  title: string;
  description?: string;
  trigger_type: MaintenanceTriggerType;
  target_value: number; // e.g. 10000 km, 500 hours, or 90 days
  last_service_value: number; // mileage or hours at last service
  last_service_date?: string; // YYYY-MM-DD
  created_at: string;
}

export interface IssueAttachment {
  id: string;
  issue_id: string;
  file_url: string; // Base64 data URL or external URL
  file_name?: string;
  created_at: string;
}

export interface Issue {
  id: string;
  tenant_id: string;
  vehicle_id: string;
  reported_by_user_id: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  mobility: MobilityStatus;
  status: IssueStatus;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  assigned_workshop?: string;
  repair_cost?: number;
  repair_notes?: string;
  attachments?: IssueAttachment[];
  resolved_at?: string;
  created_at: string;
  updated_at?: string;
}

export type HealthStatus = 'green' | 'yellow' | 'red';

export interface VehicleMaintenanceHealth {
  vehicleId: string;
  status: HealthStatus;
  reason: string;
  hasStoppedIssue: boolean;
  minRemainingPercentage: number;
  nearestPlanTitle?: string;
  plansStatus: {
    planId: string;
    title: string;
    triggerType: MaintenanceTriggerType;
    remaining: number;
    percentRemaining: number;
    isOverdue: boolean;
    isWarning: boolean;
  }[];
}

export interface OfflineQueueItem {
  id: string;
  type: 'create_issue' | 'update_odometer' | 'update_issue_status' | 'create_maintenance' | 'create_vehicle';
  payload: any;
  created_at: string;
  retries: number;
}

export interface NotificationItem {
  id: string;
  userId: string;
  vehicleId: string;
  planId?: string;
  type: 'maintenance_warning' | 'maintenance_overdue' | 'vehicle_stopped' | 'general';
  title: string;
  body: string;
  remainingText?: string;
  percentRemaining?: number;
  read: boolean;
  created_at: string;
}