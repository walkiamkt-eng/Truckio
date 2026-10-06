import React from 'react';
import { Truck, Car, Shield, Wrench, AlertTriangle, CheckCircle2, Printer, X } from 'lucide-react';
import type { Vehicle, MaintenancePlan, Issue, VehicleMaintenanceHealth } from '../../types/truckio.ts';
import { printVehicleDossier } from '../../utils/exportUtils.ts';

interface PrintableDossierProps {
  vehicle: Vehicle;
  plans: MaintenancePlan[];
  issues: Issue[];
  health?: VehicleMaintenanceHealth;
  onClose: () => void;
}

export const PrintableDossier: React.FC<PrintableDossierProps> = ({
  vehicle,
  plans,
  issues,
  health,
  onClose,
}) => {
  const vehicleIssues = issues.filter((i) => i.vehicle_id === vehicle.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full my-6 p-6 sm:p-8 text-slate-100 shadow-2xl relative print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Screen Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800 print:hidden mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
              <Truck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">
                Ficha Técnica & Auditoría Mecánica Oficial
              </h2>
              <p className="text-xs text-slate-400">
                Documento de transferencia y control de mantenimiento de flota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={printVehicleDossier}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Exportar a PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="space-y-6 print:text-black">
          {/* Header of the Dossier */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 print:border-black">
            <div>
              <div className="text-2xl font-black tracking-tight font-mono text-white print:text-black">
                TRUCKIO <span className="text-amber-500 print:text-amber-600">FLEET DOSSIER</span>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600">
                Transportes Aconcagua S.A. • CUIT: 30-71289456-4 • Registro de Flota
              </p>
              <p className="text-[10px] text-slate-500 print:text-slate-500 mt-0.5">
                Generado: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR')}
              </p>
            </div>

            <div className="text-right">
              <div className="font-mono text-xl font-black px-3 py-1 bg-slate-800 print:bg-slate-200 rounded-lg text-amber-400 print:text-black border border-slate-700 print:border-black inline-block">
                {vehicle.license_plate}
              </div>
              <div className="text-[10px] text-slate-400 print:text-slate-600 uppercase mt-1 font-bold">
                {vehicle.type === 'truck' ? 'Tractor de Carretera' : 'Semirremolque'}
              </div>
            </div>
          </div>

          {/* Vehicle Specifications Grid */}
          <div className="bg-slate-950/60 print:bg-slate-100 p-4 rounded-2xl border border-slate-800 print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider mb-3">
              1. Ficha del Vehículo & Datos Técnicos
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Marca y Modelo:</span>
                <span className="font-bold text-white print:text-black">
                  {vehicle.brand} {vehicle.model}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Año de Fabricación:</span>
                <span className="font-bold text-white print:text-black">{vehicle.year || '2022'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Número VIN / Chasis:</span>
                <span className="font-mono font-bold text-white print:text-black">{vehicle.vin || 'N/D'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Estado Operativo:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700">
                  {vehicle.is_active ? 'Unidad Activa' : 'Baja'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Odómetro Registrado:</span>
                <span className="font-mono font-black text-sm text-amber-400 print:text-black">
                  {vehicle.current_mileage.toLocaleString()} km
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Horas Motor Totales:</span>
                <span className="font-mono font-black text-sm text-blue-400 print:text-black">
                  {vehicle.current_engine_hours.toLocaleString()} hs
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px]">Destino / Notas de Operación:</span>
                <span className="text-slate-300 print:text-slate-800 italic">
                  {vehicle.notes || 'Asignado a corredor troncal nacional.'}
                </span>
              </div>
            </div>
          </div>

          {/* Maintenance Plans & Status */}
          <div className="bg-slate-950/60 print:bg-slate-100 p-4 rounded-2xl border border-slate-800 print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider mb-3">
              2. Plan de Mantenimiento Preventivo Asignado ({plans.length})
            </h3>
            {plans.length === 0 ? (
              <p className="text-xs text-slate-500">Sin planes de mantenimiento programados.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {plans.map((p) => {
                  const currentVal =
                    p.trigger_type === 'mileage' ? vehicle.current_mileage : vehicle.current_engine_hours;
                  const nextDue = p.last_service_value + p.target_value;
                  const remaining = nextDue - currentVal;
                  const isOverdue = remaining <= 0;

                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 print:bg-white border border-slate-800 print:border-slate-200"
                    >
                      <div>
                        <div className="font-bold text-white print:text-black">{p.title}</div>
                        <div className="text-[11px] text-slate-400 print:text-slate-600">
                          Frecuencia: cada {p.target_value.toLocaleString()}{' '}
                          {p.trigger_type === 'mileage' ? 'km' : 'hs'} | Último:{' '}
                          {p.last_service_value.toLocaleString()} ({p.last_service_date || 'Inicial'})
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            isOverdue
                              ? 'bg-red-500/20 text-red-400 print:text-red-700'
                              : remaining <= p.target_value * 0.15
                              ? 'bg-amber-500/20 text-amber-400 print:text-amber-700'
                              : 'bg-emerald-500/20 text-emerald-400 print:text-emerald-700'
                          }`}
                        >
                          {isOverdue ? '¡VENCIDO!' : `Resta: ${remaining.toLocaleString()}`}
                        </span>
                        <div className="text-[10px] text-slate-500 print:text-slate-600">
                          Próximo a los {nextDue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical Issues / Incidents */}
          <div className="bg-slate-950/60 print:bg-slate-100 p-4 rounded-2xl border border-slate-800 print:border-slate-300">
            <h3 className="text-xs font-bold text-slate-400 print:text-slate-700 uppercase tracking-wider mb-3">
              3. Historial de Incidencias & Reparaciones ({vehicleIssues.length})
            </h3>
            {vehicleIssues.length === 0 ? (
              <p className="text-xs text-slate-500">Sin incidencias registradas en esta unidad.</p>
            ) : (
              <div className="space-y-2 text-xs">
                {vehicleIssues.map((iss) => (
                  <div
                    key={iss.id}
                    className="p-3 rounded-xl bg-slate-900 print:bg-white border border-slate-800 print:border-slate-200"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white print:text-black">{iss.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-800 print:bg-slate-200 text-slate-300 print:text-slate-800">
                        {iss.status}
                      </span>
                    </div>
                    <p className="text-slate-400 print:text-slate-600 text-[11px] mt-1">{iss.description}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 print:text-slate-600 mt-2 pt-2 border-t border-slate-800 print:border-slate-200">
                      <span>Taller: {iss.assigned_workshop || 'No asignado'}</span>
                      <span>Costo: ${iss.repair_cost ? iss.repair_cost.toLocaleString('es-AR') : '0'} ARS</span>
                      <span>Fecha: {new Date(iss.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transfer & Audit Signature Blocks (for formal transfer) */}
          <div className="pt-8 border-t-2 border-slate-800 print:border-black grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <div className="h-16 border-b border-dashed border-slate-600 print:border-slate-400" />
              <p className="font-bold text-slate-300 print:text-black mt-2">Responsable de Mantenimiento</p>
              <p className="text-[11px] text-slate-500 print:text-slate-600">Ing. Mariana Rossi — Gestora de Flota</p>
            </div>
            <div>
              <div className="h-16 border-b border-dashed border-slate-600 print:border-slate-400" />
              <p className="font-bold text-slate-300 print:text-black mt-2">Chofer / Receptor Técnico</p>
              <p className="text-[11px] text-slate-500 print:text-slate-600">Conformidad de Estado y Odómetro</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
