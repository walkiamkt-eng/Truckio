import React, { useState } from 'react';
import {
  Truck,
  Car,
  Wrench,
  FileSpreadsheet,
  Plus,
  Search,
  AlertTriangle,
  Eye,
  Edit,
  FileText,
} from 'lucide-react';
import { exportFleetExcelReport } from '../../utils/exportUtils.ts';
import { PrintableDossier } from './PrintableDossier.tsx';
import { FleetReportPDFModal } from './FleetReportPDFModal.tsx';
import { FleetHealthBarChart } from './FleetHealthBarChart.tsx';
import { VehicleModal } from './VehicleModal.tsx';
import { MaintenancePlanModal } from './MaintenancePlanModal.tsx';
import type {
  Vehicle,
  MaintenancePlan,
  Issue,
  User,
  VehicleMaintenanceHealth,
  HealthStatus,
} from '../../types/truckio.ts';
import confetti from 'canvas-confetti';

interface FleetDashboardProps {
  currentUser: User;
  vehicles: Vehicle[];
  plans: MaintenancePlan[];
  issues: Issue[];
  healthMap: Record<string, VehicleMaintenanceHealth>;
  onRefresh: () => void;
}

export const FleetDashboard: React.FC<FleetDashboardProps> = ({
  currentUser,
  vehicles,
  plans,
  issues,
  healthMap,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'truck' | 'trailer'>('all');
  const [filterHealth, setFilterHealth] = useState<'all' | HealthStatus>('all');

  // Modals state
  const [dossierVehicle, setDossierVehicle] = useState<Vehicle | null>(null);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null | 'new'>(null);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  // Semaphoric counts
  const greenCount = vehicles.filter((v) => healthMap[v.id]?.status === 'green').length;
  const yellowCount = vehicles.filter((v) => healthMap[v.id]?.status === 'yellow').length;
  const redCount = vehicles.filter((v) => healthMap[v.id]?.status === 'red').length;
  const stoppedUnitsCount = issues.filter((i) => i.mobility === 'stopped' && i.status !== 'resolved').length;

  const totalCost = issues.reduce((acc, curr) => acc + (curr.repair_cost || 0), 0);

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    if (filterType !== 'all' && v.type !== filterType) return false;
    const h = healthMap[v.id]?.status || 'green';
    if (filterHealth !== 'all' && h !== filterHealth) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        v.license_plate.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportExcel = () => {
    exportFleetExcelReport(vehicles, plans, issues, healthMap);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.2 },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Executive KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total de Unidades
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{vehicles.length}</span>
            <span className="text-xs text-slate-400">
              {vehicles.filter((v) => v.type === 'truck').length} C / {vehicles.filter((v) => v.type === 'trailer').length} R
            </span>
          </div>
        </div>

        {/* 🟢 Verde */}
        <div
          onClick={() => setFilterHealth(filterHealth === 'green' ? 'all' : 'green')}
          className={`bg-slate-900 border p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
            filterHealth === 'green'
              ? 'border-emerald-500 bg-emerald-950/20 ring-1 ring-emerald-500/40'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              🟢 En Regla (&gt;15%)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{greenCount}</span>
            <span className="text-xs text-slate-400">
              {Math.round((greenCount / (vehicles.length || 1)) * 100)}%
            </span>
          </div>
        </div>

        {/* 🟡 Amarillo */}
        <div
          onClick={() => setFilterHealth(filterHealth === 'yellow' ? 'all' : 'yellow')}
          className={`bg-slate-900 border p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
            filterHealth === 'yellow'
              ? 'border-amber-500 bg-amber-950/20 ring-1 ring-amber-500/40'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              🟡 Alerta (≤15%)
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{yellowCount}</span>
            <span className="text-xs text-slate-400">Próximos a vencer</span>
          </div>
        </div>

        {/* 🔴 Rojo */}
        <div
          onClick={() => setFilterHealth(filterHealth === 'red' ? 'all' : 'red')}
          className={`bg-slate-900 border p-4 rounded-2xl cursor-pointer transition flex flex-col justify-between ${
            filterHealth === 'red'
              ? 'border-red-500 bg-red-950/20 ring-1 ring-red-500/40'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
              🔴 Críticos / Parados
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{redCount}</span>
            <span className="text-xs text-red-300 font-bold">
              {stoppedUnitsCount > 0 ? `${stoppedUnitsCount} parada(s)` : 'Vencidos'}
            </span>
          </div>
        </div>

        {/* Total Gasto en Taller */}
        <div className="col-span-2 sm:col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Gasto Total en Taller
          </span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-xl sm:text-2xl font-black text-amber-400 font-mono">
              ${totalCost.toLocaleString('es-AR')}
            </span>
            <span className="text-xs text-slate-400">ARS</span>
          </div>
        </div>
      </div>

      {/* Comparative Health Bar Chart Component */}
      <FleetHealthBarChart
        vehicles={vehicles}
        healthMap={healthMap}
        issues={issues}
      />

      {/* Control & Export Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        {/* Search & Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar patente, marca o modelo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterType === 'all' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({vehicles.length})
            </button>
            <button
              onClick={() => setFilterType('truck')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterType === 'truck' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              🚚 Camiones ({vehicles.filter((v) => v.type === 'truck').length})
            </button>
            <button
              onClick={() => setFilterType('trailer')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                filterType === 'trailer' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              🚛 Remolques ({vehicles.filter((v) => v.type === 'trailer').length})
            </button>
          </div>

          {filterHealth !== 'all' && (
            <button
              onClick={() => setFilterHealth('all')}
              className="text-xs text-amber-400 hover:underline px-2 py-1"
            >
              Quitar filtro ({filterHealth})
            </button>
          )}
        </div>

        {/* Primary Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
            title="Generar y descargar informe en PDF del estado de mantenimiento e incidencias"
          >
            <FileText className="w-4 h-4" />
            <span>Resumen PDF Flota</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm active:scale-95"
            title="Exportar tablas dinámicas con historial de mantenimientos y costos a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={() => setVehicleToEdit('new')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white text-xs font-bold transition active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nueva Unidad</span>
          </button>

          <button
            onClick={() => setPlanModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-sm active:scale-95"
          >
            <Wrench className="w-4 h-4" />
            <span>Nuevo Plan Preventivo</span>
          </button>
        </div>
      </div>

      {/* Fleet Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.map((vehicle) => {
          const health = healthMap[vehicle.id];
          const vehicleActiveIssues = issues.filter(
            (i) => i.vehicle_id === vehicle.id && i.status !== 'resolved'
          );
          const isStopped = vehicleActiveIssues.some((i) => i.mobility === 'stopped');

          return (
            <div
              key={vehicle.id}
              className={`bg-slate-900 border rounded-2xl p-5 text-slate-100 flex flex-col justify-between transition shadow-md ${
                health?.status === 'red'
                  ? 'border-red-500/50 shadow-red-950/20'
                  : health?.status === 'yellow'
                  ? 'border-amber-500/50 shadow-amber-950/20'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header: License plate, Type, and Semaphoric Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg text-xs ${
                        vehicle.type === 'truck'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      }`}
                    >
                      {vehicle.type === 'truck' ? <Truck className="w-4 h-4" /> : <Car className="w-4 h-4" />}
                    </span>
                    <span className="font-mono text-base font-black text-white tracking-wide">
                      {vehicle.license_plate}
                    </span>
                  </div>

                  {/* Semaphoric Status Pill */}
                  <span
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                      health?.status === 'green'
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : health?.status === 'yellow'
                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                        : 'bg-red-500/15 border-red-500/30 text-red-400 animate-pulse'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        health?.status === 'green'
                          ? 'bg-emerald-400'
                          : health?.status === 'yellow'
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                    />
                    <span>
                      {health?.status === 'green'
                        ? 'En Regla (>15%)'
                        : health?.status === 'yellow'
                        ? 'Alerta (≤15%)'
                        : isStopped
                        ? 'Unidad Parada'
                        : 'Vencido'}
                    </span>
                  </span>
                </div>

                {/* Vehicle Model & Year */}
                <h4 className="text-sm font-bold text-white mb-0.5">
                  {vehicle.brand} {vehicle.model}
                </h4>
                <p className="text-xs text-slate-400">
                  Año {vehicle.year || 2022} • VIN: {vehicle.vin || 'N/D'}
                </p>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2 my-3 p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Odómetro</span>
                    <span className="font-mono font-bold text-sm text-white">
                      {vehicle.current_mileage.toLocaleString()} km
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">Horas Motor</span>
                    <span className="font-mono font-bold text-sm text-white">
                      {vehicle.current_engine_hours.toLocaleString()} hs
                    </span>
                  </div>
                </div>

                {/* Health Reason / Alert Detail */}
                <div className="text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="text-[11px] font-semibold">Estado de Mantenimiento:</span>
                    <span className="font-mono font-bold text-[11px] text-slate-300">
                      Margen: {health?.minRemainingPercentage}%
                    </span>
                  </div>
                  <p
                    className={`text-[11px] p-2 rounded-lg leading-snug ${
                      health?.status === 'green'
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : health?.status === 'yellow'
                        ? 'bg-amber-500/10 text-amber-300'
                        : 'bg-red-500/10 text-red-300 font-semibold'
                    }`}
                  >
                    {health?.reason}
                  </p>
                </div>

                {/* Active Issues Alert */}
                {vehicleActiveIssues.length > 0 && (
                  <div className="mt-2 text-[11px] p-2 bg-red-500/15 border border-red-500/30 rounded-lg text-red-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      {vehicleActiveIssues.length} incidencia(s) activa(s)
                    </span>
                    {isStopped && (
                      <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] font-black uppercase">
                        Unidad Parada
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                <button
                  onClick={() => setDossierVehicle(vehicle)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition"
                  title="Ficha técnica de unidad y auditoría imprimible PDF"
                >
                  <Eye className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dossier</span>
                </button>

                <button
                  onClick={() => setVehicleToEdit(vehicle)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white flex items-center justify-center gap-1 transition"
                  title="Editar datos del vehículo"
                >
                  <Edit className="w-3.5 h-3.5 text-slate-400" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      {/* 1. Vehicle Technical Dossier / PDF Print */}
      {dossierVehicle && (
        <PrintableDossier
          vehicle={dossierVehicle}
          plans={plans.filter((p) => p.vehicle_id === dossierVehicle.id)}
          issues={issues}
          health={healthMap[dossierVehicle.id]}
          onClose={() => setDossierVehicle(null)}
        />
      )}

      {/* 2. Add / Edit Vehicle Modal */}
      {vehicleToEdit && (
        <VehicleModal
          vehicleToEdit={vehicleToEdit === 'new' ? null : vehicleToEdit}
          tenantId={currentUser.tenant_id}
          onClose={() => setVehicleToEdit(null)}
          onSuccess={() => {
            setVehicleToEdit(null);
            onRefresh();
          }}
        />
      )}

      {/* 3. Maintenance Plan Modal */}
      {planModalOpen && (
        <MaintenancePlanModal
          vehicles={vehicles}
          tenantId={currentUser.tenant_id}
          onClose={() => setPlanModalOpen(false)}
          onSuccess={() => {
            setPlanModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* 4. Fleet Maintenance & Pending Issues PDF Report Modal */}
      {pdfModalOpen && (
        <FleetReportPDFModal
          vehicles={vehicles}
          plans={plans}
          issues={issues}
          healthMap={healthMap}
          onClose={() => setPdfModalOpen(false)}
        />
      )}
    </div>
  );
};