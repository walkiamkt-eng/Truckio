import Dexie, { type Table } from 'dexie';
import type {
  Tenant,
  User,
  Vehicle,
  MaintenancePlan,
  Issue,
  IssueAttachment,
  OfflineQueueItem,
} from '../types/truckio.ts';

export class TruckioDatabase extends Dexie {
  tenants!: Table<Tenant, string>;
  users!: Table<User, string>;
  vehicles!: Table<Vehicle, string>;
  maintenance_plans!: Table<MaintenancePlan, string>;
  issues!: Table<Issue, string>;
  issue_attachments!: Table<IssueAttachment, string>;
  offline_queue!: Table<OfflineQueueItem, string>;

  constructor() {
    super('TruckioFleetDB');
    this.version(1).stores({
      tenants: 'id, name',
      users: 'id, tenant_id, email, role',
      vehicles: 'id, tenant_id, license_plate, type, is_active',
      maintenance_plans: 'id, tenant_id, vehicle_id, trigger_type',
      issues: 'id, tenant_id, vehicle_id, status, severity, mobility, created_at',
      issue_attachments: 'id, issue_id',
      offline_queue: 'id, type, created_at',
    });
  }
}

export const db = new TruckioDatabase();

// Initial Pilot Seed Data (1 Tenant, 3 Users, 10 Vehicles: 5 Trucks + 5 Trailers, Pre-configured maintenance rules & issues)
export const DEFAULT_TENANT_ID = '11111111-1111-1111-1111-111111111111';

export const INITIAL_TENANT: Tenant = {
  id: DEFAULT_TENANT_ID,
  name: 'Transportes Aconcagua S.A.',
  created_at: new Date('2025-01-10T08:00:00Z').toISOString(),
};

export const INITIAL_USERS: User[] = [
  {
    id: 'user-driver-carlos',
    tenant_id: DEFAULT_TENANT_ID,
    email: 'carlos.gutierrez@aconcagua.com',
    full_name: 'Carlos Gutiérrez',
    role: 'driver',
    phone: '+54 9 11 4820-9912',
    assigned_vehicle_id: 'veh-truck-01',
    created_at: new Date('2025-01-15T09:00:00Z').toISOString(),
  },
  {
    id: 'user-fleet-mariana',
    tenant_id: DEFAULT_TENANT_ID,
    email: 'mariana.rossi@aconcagua.com',
    full_name: 'Ing. Mariana Rossi',
    role: 'fleet_manager',
    phone: '+54 9 11 5532-1100',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },
  {
    id: 'user-admin-lucas',
    tenant_id: DEFAULT_TENANT_ID,
    email: 'lucas.admin@aconcagua.com',
    full_name: 'Lucas Benítez (Admin General)',
    role: 'admin',
    phone: '+54 9 11 3290-7711',
    created_at: new Date('2025-01-10T08:00:00Z').toISOString(),
  },
];

export const INITIAL_VEHICLES: Vehicle[] = [
  // 5 Tractores (Camiones)
  {
    id: 'veh-truck-01',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'AE 482 OK',
    type: 'truck',
    brand: 'Scania',
    model: 'R450 6x2 Highline',
    year: 2022,
    vin: '9BS8482OK6612984',
    current_mileage: 142500,
    current_engine_hours: 4200,
    is_active: true,
    notes: 'Tractor asignado a corredor Buenos Aires - Córdoba - Mendoza.',
    created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-truck-02',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'AF 193 TX',
    type: 'truck',
    brand: 'Volvo',
    model: 'FH 540 Globetrotter 6x4',
    year: 2023,
    vin: '9BV8193TX7729104',
    current_mileage: 89200,
    current_engine_hours: 2850,
    is_active: true,
    notes: 'Configuración bitren cerealero y cargas pesadas.',
    created_at: new Date('2025-01-20T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-truck-03',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'AD 910 ZZ',
    type: 'truck',
    brand: 'Mercedes-Benz',
    model: 'Actros 2548 StreamSpace',
    year: 2021,
    vin: '8MB910ZZ4409211',
    current_mileage: 210400,
    current_engine_hours: 6100,
    is_active: true,
    notes: 'Unidad de larga distancia internacional.',
    created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-truck-04',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'AG 302 LP',
    type: 'truck',
    brand: 'Iveco',
    model: 'Stralis Hi-Way 440 Cursor 13',
    year: 2024,
    vin: '8IV302LP8891230',
    current_mileage: 45600,
    current_engine_hours: 1420,
    is_active: true,
    notes: 'Unidad nueva en período de garantía de fábrica.',
    created_at: new Date('2025-02-01T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-truck-05',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'AC 712 MN',
    type: 'truck',
    brand: 'Scania',
    model: 'S500 V8 Super',
    year: 2020,
    vin: '9BS712MN3381022',
    current_mileage: 320100,
    current_engine_hours: 9800,
    is_active: true,
    notes: 'Flota pesada de transporte minero y cargas indivisibles.',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },

  // 5 Remolques (Semirremolques / Acoplados)
  {
    id: 'veh-trailer-01',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'RND-401',
    type: 'trailer',
    brand: 'Randon',
    model: 'Semirremolque B-Train Cerealero 3 Ejes',
    year: 2022,
    vin: '9RN4019283719001',
    current_mileage: 180000,
    current_engine_hours: 0,
    is_active: true,
    notes: 'Tolva cerealera 52 m3 con lona corrediza automática.',
    created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-trailer-02',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'VLC-882',
    type: 'trailer',
    brand: 'Vulcano',
    model: 'Batea Volcable V-40 de 3 Ejes',
    year: 2023,
    vin: '9VL8820192839912',
    current_mileage: 65000,
    current_engine_hours: 0,
    is_active: true,
    notes: 'Transporte de áridos y concentrado mineral.',
    created_at: new Date('2025-01-25T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-trailer-03',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'BNN-915',
    type: 'trailer',
    brand: 'Bonano',
    model: 'Furgón Térmico 28 Pallets + Thermo King',
    year: 2021,
    vin: '9BN9157291038472',
    current_mileage: 112000,
    current_engine_hours: 3400,
    is_active: true,
    notes: 'Equipo refrigerado Thermo King SLXi 400 Whisper Pro.',
    created_at: new Date('2025-01-18T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-trailer-04',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'MNG-304',
    type: 'trailer',
    brand: 'Montenegro',
    model: 'Portacontenedor 40ft Twist-Locks Reforzado',
    year: 2022,
    vin: '9MN3048192830192',
    current_mileage: 94000,
    current_engine_hours: 0,
    is_active: true,
    notes: 'Operación puerto Buenos Aires / Dock Sud.',
    created_at: new Date('2025-01-15T10:00:00Z').toISOString(),
  },
  {
    id: 'veh-trailer-05',
    tenant_id: DEFAULT_TENANT_ID,
    license_plate: 'CRM-550',
    type: 'trailer',
    brand: 'Cormetal',
    model: 'Sider Cortina Rápida 14.5m',
    year: 2021,
    vin: '9CR5501928374619',
    current_mileage: 154000,
    current_engine_hours: 0,
    is_active: true,
    notes: 'Transporte de consumo masivo y bebidas.',
    created_at: new Date('2025-01-12T10:00:00Z').toISOString(),
  },
];

export const INITIAL_MAINTENANCE_PLANS: MaintenancePlan[] = [
  // Planes para Scania R450 (veh-truck-01) -> Salud VERDE (Margen > 15%)
  {
    id: 'plan-01',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-truck-01',
    title: 'Cambio de Aceite Sintético y Filtros de Motor',
    description: 'Reemplazo de 38L 10W-40, filtro de aceite, combustible y trampa de agua.',
    trigger_type: 'mileage',
    target_value: 40000, // cada 40.000 km
    last_service_value: 120000, // último a los 120.000 km -> próximo a 160.000 km (actual 142.500 km -> resta 17.500 km, margen 43.7% -> VERDE)
    last_service_date: '2025-01-05',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },
  {
    id: 'plan-02',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-truck-01',
    title: 'Regulación de Válvulas e Inyectores PDE/XPI',
    description: 'Control de holgura de balancines y calibración electrónica.',
    trigger_type: 'mileage',
    target_value: 80000,
    last_service_value: 100000, // próximo 180.000 km -> resta 37.500 km -> VERDE
    last_service_date: '2024-11-12',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },

  // Planes para Mercedes-Benz Actros (veh-truck-03) -> Salud ROJA (VENCIDO + UNIDAD PARADA)
  {
    id: 'plan-03',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-truck-03',
    title: 'Service Mayor de Caja Powershift y Diferencial',
    description: 'Cambio de fluidos sintéticos MB 235.11 y verificación de embrague.',
    trigger_type: 'mileage',
    target_value: 60000,
    last_service_value: 150000, // próximo a los 210.000 km -> actual 210.400 km (¡VENCIDO POR 400 KM! -> ROJO)
    last_service_date: '2024-09-18',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },

  // Planes para Vulcano Batea (veh-trailer-02) -> Salud AMARILLA (Margen <= 15%)
  {
    id: 'plan-04',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-trailer-02',
    title: 'Engrase Integral y Torque de Mazas / Puntas de Eje',
    description: 'Lubricación de levas de freno, rodillos y verificación de juego axial.',
    trigger_type: 'mileage',
    target_value: 20000,
    last_service_value: 46000, // próximo a los 66.000 km -> actual 65.000 km (restan 1.000 km = 5% restante <= 15% -> AMARILLO)
    last_service_date: '2025-01-12',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },

  // Planes para Bonano Furgón Térmico (veh-trailer-03) -> Basado en horas motor equipo de frío
  {
    id: 'plan-05',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-trailer-03',
    title: 'Mantenimiento Preventivo Unidad Thermo King SLXi',
    description: 'Cambio de correas, aceite de compresor Copeland, filtro secador y gas R452A.',
    trigger_type: 'engine_hours',
    target_value: 1000, // cada 1.000 hs
    last_service_value: 2500, // próximo a 3.500 hs -> actual 3.400 hs (restan 100 hs = 10% restante <= 15% -> AMARILLO)
    last_service_date: '2024-12-01',
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },

  // Plan por intervalo de tiempo para Volvo FH (veh-truck-02)
  {
    id: 'plan-06',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-truck-02',
    title: 'Inspección Técnica Obligatoria RTO / VTV Anual',
    description: 'Verificación de frenometría, gases de escape y tren delantero.',
    trigger_type: 'time_interval',
    target_value: 365, // cada 365 días
    last_service_value: 0,
    last_service_date: '2024-11-01', // faltan meses -> VERDE
    created_at: new Date('2025-01-10T10:00:00Z').toISOString(),
  },
];

export const INITIAL_ISSUES: Issue[] = [
  // Incidencia Crítica - UNIDAD PARADA (Dispara estado ROJO en Mercedes-Benz Actros)
  {
    id: 'iss-01',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-truck-03',
    reported_by_user_id: 'user-driver-carlos',
    title: 'Pérdida de presión en circuito de frenos y manguera neumática cortada',
    description: 'Al frenar en peaje de Zárate sonó la alarma sonora de baja presión de aire en ejes traseros. Manómetro marca 4.5 bar y el compresor no recupera. Camión orillado en banquina segura km 92.',
    severity: 'critical',
    mobility: 'stopped',
    status: 'reported',
    city: 'Zárate',
    state: 'Buenos Aires',
    latitude: -34.0982,
    longitude: -59.0289,
    assigned_workshop: 'Auxilio Mecánico del Norte',
    created_at: new Date('2025-02-14T14:32:00Z').toISOString(),
    attachments: [
      {
        id: 'att-01',
        issue_id: 'iss-01',
        file_url: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80',
        file_name: 'manguera_freno_danada.jpg',
        created_at: new Date('2025-02-14T14:35:00Z').toISOString(),
      },
    ],
  },

  // Incidencia en Taller - Remolque Bonano Térmico
  {
    id: 'iss-02',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-trailer-03',
    reported_by_user_id: 'user-driver-carlos',
    title: 'Falla intermitente en sensor de deshielo Thermo King (Código alarma 20)',
    description: 'El display indica código 20 por temperatura de serpentina anormal. La carga de lácteos requiere mantener -18°C y está subiendo a -12°C.',
    severity: 'high',
    mobility: 'running',
    status: 'in_workshop',
    city: 'Rosario',
    state: 'Santa Fe',
    assigned_workshop: 'Refrigeración Integral del Litoral',
    repair_cost: 245000,
    repair_notes: 'Reemplazo de termistor de evaporador y presostato de alta. En prueba de ciclado.',
    created_at: new Date('2025-02-10T11:15:00Z').toISOString(),
  },

  // Incidencia Resuelta - Scania S500
  {
    id: 'iss-03',
    tenant_id: DEFAULT_TENANT_ID,
    vehicle_id: 'veh-truck-05',
    reported_by_user_id: 'user-driver-carlos',
    title: 'Vibración en tren delantero a 85 km/h',
    description: 'Se detectó desbalanceo en neumático delantero derecho y juego en extremo de dirección.',
    severity: 'medium',
    mobility: 'running',
    status: 'resolved',
    city: 'Córdoba',
    state: 'Córdoba',
    assigned_workshop: 'Scania Taller Oficial Córdoba',
    repair_cost: 180000,
    repair_notes: 'Cambio de extremo de dirección izquierdo y alineación computarizada.',
    resolved_at: new Date('2025-02-08T18:00:00Z').toISOString(),
    created_at: new Date('2025-02-06T09:20:00Z').toISOString(),
  },
];

// Seed Helper
export async function seedDatabaseIfEmpty() {
  const vehicleCount = await db.vehicles.count();
  if (vehicleCount === 0) {
    console.log('Seeding initial Truckio pilot data...');
    await db.tenants.put(INITIAL_TENANT);
    await db.users.bulkPut(INITIAL_USERS);
    await db.vehicles.bulkPut(INITIAL_VEHICLES);
    await db.maintenance_plans.bulkPut(INITIAL_MAINTENANCE_PLANS);
    await db.issues.bulkPut(INITIAL_ISSUES);
    console.log('Seeding complete.');
  }
}
