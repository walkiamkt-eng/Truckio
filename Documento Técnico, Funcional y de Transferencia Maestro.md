Documento Técnico, Funcional y de Transferencia Maestro
Proyecto: TRUCKIO — Sistema de Gestión Integrada de Mantenimiento de Flotas

Versión: 1.0.0

Estado: Especificación Técnica de Arquitectura e Implementación

1. Visión General y Alcance del Producto
1.1 Problema Central
Las empresas de transporte con flotas operativas enfrentan altos costos por paradas no planificadas, reparaciones de emergencia y pérdida de trazabilidad sobre el plan de mantenimiento preventivo de sus vehículos. Los choferes en ruta carecen de una herramienta simple e inmediata para registrar odómetros, horas motor e incidencias en tiempo real, lo que genera desinformación entre la operación en ruta y la gestión centralizada.

1.2 Cliente Piloto y Escalabilidad
Fase Piloto (MVP): Empresa de transporte con flota propia de hasta 10 unidades (tractores y remolques).

Fase Escalable (B2B SaaS): Plataforma Multi-tenant orientada a pequeñas y medianas empresas de logística y transporte.

1.3 Promesa Principal (One-Liner)
Gestión integral y trazable del plan de mantenimiento preventivo y correctivo para camiones y remolques, optimizada para la operación directa en ruta por parte de los choferes mediante una PWA Offline-First.

2. Arquitectura de Datos Relacional (PostgreSQL)
El esquema implementa Row Level Security (RLS) desde el día 1 mediante la columna tenant_id para garantizar un aislamiento estricto de datos entre empresas.

SQL
-- Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ORGANIZACIONES / TENANTS
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. USUARIOS
CREATE TYPE user_role AS ENUM ('driver', 'fleet_manager', 'admin');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(150) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role NOT NULL DEFAULT 'driver',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. VEHÍCULOS (Tractores y Remolques)
CREATE TYPE vehicle_type AS ENUM ('truck', 'trailer');

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    type vehicle_type NOT NULL,
    brand VARCHAR(50),
    model VARCHAR(50),
    current_mileage NUMERIC(10,2) DEFAULT 0.00,
    current_engine_hours NUMERIC(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_license_per_tenant UNIQUE (tenant_id, license_plate)
);

-- 4. REGLAS DE MANTENIMIENTO PREVENTIVO
CREATE TYPE maintenance_trigger_type AS ENUM ('mileage', 'engine_hours', 'time_interval');

CREATE TABLE maintenance_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    trigger_type maintenance_trigger_type NOT NULL,
    target_value NUMERIC(10,2) NOT NULL, -- Valor meta (ej: 10000 km, 500 hs, o 30 días)
    last_service_value NUMERIC(10,2) DEFAULT 0.00,
    last_service_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. INCIDENCIAS / EVENTOS NO PROGRAMADOS
CREATE TYPE issue_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE mobility_status AS ENUM ('stopped', 'running');
CREATE TYPE issue_status AS ENUM ('reported', 'under_review', 'in_workshop', 'resolved');

CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    reported_by_user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    severity issue_severity NOT NULL DEFAULT 'medium',
    mobility mobility_status NOT NULL DEFAULT 'running',
    status issue_status NOT NULL DEFAULT 'reported',
    city VARCHAR(100),
    state VARCHAR(100),
    assigned_workshop VARCHAR(150),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. ADJUNTOS / EVIDENCIAS FOTOGRÁFICAS
CREATE TABLE issue_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- CONFIGURACIÓN ROW LEVEL SECURITY (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_policy ON vehicles
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
3. Especificación de Módulos y Flujos de Usuario
3.1 Flujo del Chofer (Mobile-First / PWA)
Vista Principal: Pantalla limpia optimizada para smartphones con dos acciones inmediatas: Registrar Incidencia y Confirmar Mantenimiento.

Registro de Incidencia No Programada:

Selección de vehículo (Tractor o Remolque).

Detalle del problema, nivel de severidad y estado de la unidad (Unidad Parada / Sigue en Marcha).

Captura automática o manual de Ubicación (Ciudad, Provincia).

Carga de hasta 5 fotos con compresión automática local.

Envío directo a cola IndexedDB en caso de falta de cobertura.

3.2 Ciclo de Vida de Incidencias
Reportado⟶En Revisi 
o
ˊ
 n / Aprobado⟶En Taller / Reparaci 
o
ˊ
 n⟶Resuelto / Cerrado
[Chofer] ------------> (Reportado)
                           |
                     [Gestor Flota]
                           |
                    (En Revisión)
                           |
                     [Gestor Flota]
                           |
                    (En Taller) ---> [Ingreso datos de costo y reparación]
                           |
                     [Gestor Flota]
                           |
                    (Resuelto/Cerrado)
3.3 Dashboard del Gestor de Flotas
Tablero Semafórico de Mantenimiento:

Verde: Unidades con margen superior al 15% según plan de mantenimiento.

Amarillo: Unidades dentro del umbral de aviso (15% previo al cumplimiento).

Rojo: Unidades con mantenimiento vencido o con incidencias en estado Unidad Parada.

Exportación de Reportes (PDF / Excel):

Exportación Excel (.xlsx): Generación de tablas dinámicas con historial completo de mantenimientos, costos asociados por taller, kilómetros recorridos por vehículo e incidencias agrupadas por período y severidad.

Exportación PDF: Reportes ejecutivos formales e individuales por unidad para auditorías técnicas, ficha de vehículo e historial mecánico de transferencia.

4. Arquitectura Técnica y Estrategia Offline-First
4.1 Stack Tecnológico
Frontend & Interfaz: Next.js (React) + TailwindCSS.

PWA Engine: Workbox Service Workers + IndexedDB (Dexie.js) para persistencia e intercepción de peticiones HTTP en segundo plano.

Backend & API: Node.js con Fastify / Express o Supabase Engine.

Base de Datos: PostgreSQL con Row Level Security (RLS) activo.

Storage: Bucket compatible con S3 (Supabase Storage / AWS S3).

Librerías de Exportación: ExcelJS (Excel) y react-pdf / Puppeteer (PDF).

4.2 Estrategia de Sincronización Offline
[Cliente PWA] 
   |-- Hay Red? --YES--> [API Server Node.js/PostgreSQL]
   |
   +---NO---> [IndexedDB Storage]
                    |
              (Background Sync)
                    |
              (Al recuperar Red) ---> [Envío por Lotes] ---> [PostgreSQL]
Captura de Imagen en Cliente: Se procesa vía HTML5 Canvas/Web Worker comprimiendo a formato WebP/JPEG (máx. 1024px de ancho, calidad 0.8, peso final <1 MB).

Enfrentamiento de Conflicto de Datos: El servidor aplica política Last-Write-Wins sobre odómetros, conservando siempre la lectura de mayor valor acumulado.

5. Plan de Transferencia y Roadmap de Implementación
Fase 1: Core Base y Esquema Multitenant (Semanas 1-2)
Configuración de la base de datos PostgreSQL, tablas y políticas RLS.

Autenticación y gestión de roles (Chofer y Gestor de Flota).

CRUD de Vehículos y creación de Reglas de Mantenimiento.

Fase 2: PWA, Módulo de Ruta y Soporte Offline (Semanas 3-4)
Desarrollo de la interfaz PWA responsive para Choferes.

Implementación de Service Worker, IndexedDB y motor de sincronización offline.

Módulo de captura de imágenes con compresión en cliente y subida a Bucket S3.

Fase 3: Dashboard de Control, Alertas y Exportaciones (Semanas 5-6)
Desarrollo del panel administrativo con vista semafórica.

Ciclo de gestión de incidencias.

Módulo de generación e impresión de Reportes en PDF y Excel.

Pruebas de campo con la flota piloto (10 unidades).