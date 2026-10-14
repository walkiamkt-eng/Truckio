import React, { useState } from 'react';
import { Truck, Plus } from 'lucide-react';
import type { Vehicle, User, VehicleMaintenanceHealth } from '../../types/truckio.ts';
import { StorageService } from '../../services/storageService.ts';

interface FleetTableViewProps {
  currentUser: User;
  vehicles: Vehicle[];
  healthMap: Record<string, VehicleMaintenanceHealth>;
  onRefresh: () => void;
  onEditVehicle: (vehicle: Vehicle | null | 'new') => void;
  onOpenDossier: (vehicle: Vehicle) => void;
}

export const FleetTableView: React.FC<FleetTableViewProps> = ({
  currentUser,
  vehicles,
  healthMap,
  onRefresh,
  onEditVehicle,
  onOpenDossier,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleStatusChange = async (vehicle: Vehicle, newStatus: boolean) => {
    if (!isAdmin) return;
    setLoadingId(vehicle.id);
    try {
      await StorageService.updateVehicle(vehicle.id, {
        is_active: newStatus,
      });
      onRefresh();
    } catch (err: any) {
      alert('Error al actualizar estado del vehículo: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-white">Listado General de Vehículos ({vehicles.length})</h2>
          <p className="text-xs text-slate-400">
            Control de unidades, patentes, estado operativo y gestión administrativa
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => onEditVehicle('new')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nueva Unidad</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">Unidad / Patente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Marca y Modelo</th>
                <th className="px-4 py-3">Año / VIN</th>
                <th className="px-4 py-3">Kilometraje</th>
                <th className="px-4 py-3">Estado Operativo</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                    No hay vehículos registrados en la flota.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const isActive = v.is_active !== false;

                  return (
                    <tr key={v.id} className="hover:bg-slate-800/50 transition">
                      <td className="px-4 py-3 font-mono font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        {v.license_plate}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 font-semibold text-slate-300">
                          {v.type === 'truck' ? '🚚 Tractor' : '🚛 Remolque'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-white">
                        {v.brand} {v.model}
                      </td>
                      <td className="px-4 py-3 text-slate-400">
                        {v.year || '2022'} • <span className="font-mono">{v.vin || 'S/N'}</span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-amber-400">
                        {(v.current_km || 0).toLocaleString()} km
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isActive
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                              : 'bg-red-500/15 border-red-500/30 text-red-400'
                          }`}
                        >
                          {isActive ? '🟢 Operativa' : '🔴 Inactiva / Baja'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenDossier(v)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
                        >
                          Dossier
                        </button>

                        {isAdmin && (
                          <>
                            <button
                              onClick={() => onEditVehicle(v)}
                              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg font-semibold transition"
                            >
                              Editar
                            </button>
                            <button
                              disabled={loadingId === v.id}
                              onClick={() => handleStatusChange(v, !isActive)}
                              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                                isActive
                                  ? 'bg-red-600/20 hover:bg-red-600/30 text-red-300'
                                  : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300'
                              }`}
                            >
                              {isActive ? 'Dar de Baja' : 'Reactivar'}
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};