import React, { useState } from 'react';
import { DriverAlertBanner } from './DriverAlertBanner.tsx';
import { Truck, Gauge, Clock, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StorageService } from '../../services/storageService.ts';
import type { User, Vehicle, MaintenancePlan, Issue } from '../../types/truckio.ts';

interface DriverViewProps {
  currentUser: User;
  vehicles?: Vehicle[];
  maintenancePlans?: MaintenancePlan[];
  issues?: Issue[];
  onRefreshData?: () => void;
}

export const DriverView: React.FC<DriverViewProps> = ({
  currentUser,
  vehicles = [],
  maintenancePlans = [],
  issues = [],
  onRefreshData,
}) => {
  const assignedVehicle = vehicles.find((v) => v.assigned_driver_id === currentUser.id) || vehicles[0] || null;

  const [mileage, setMileage] = useState<number | ''>(assignedVehicle?.current_mileage || '');
  const [hours, setHours] = useState<number | ''>(assignedVehicle?.current_engine_hours || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpdateOdometer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedVehicle || mileage === '' || hours === '') return;

    setLoading(true);
    setMessage(null);
    try {
      await StorageService.updateOdometerAndHours(
        assignedVehicle.id,
        Number(mileage),
        Number(hours),
        currentUser.id
      );
      setMessage('✅ Odómetro y horas actualizados correctamente');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      setMessage(`❌ Error: ${err.message || 'No se pudo actualizar'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Banner de Alertas */}
      <DriverAlertBanner
        assignedVehicle={assignedVehicle}
        maintenancePlans={maintenancePlans}
        issues={issues}
      />

      {/* Header Info Vehículo Asignado */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Unidad Asignada</span>
            <h2 className="text-2xl font-black text-white font-mono">
              {assignedVehicle ? assignedVehicle.license_plate : 'Sin asignación'}
            </h2>
            <p className="text-xs text-slate-400">
              {assignedVehicle ? `${assignedVehicle.brand} ${assignedVehicle.model}` : 'Contacte al gestor de flota'}
            </p>
          </div>
        </div>

        {assignedVehicle && (
          <div className="flex gap-4 text-sm bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 w-full md:w-auto justify-around">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Kilometraje</div>
              <div className="text-base font-bold text-slate-200 font-mono">
                {assignedVehicle.current_mileage.toLocaleString()} km
              </div>
            </div>
            <div className="border-r border-slate-800" />
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Horómetro</div>
              <div className="text-base font-bold text-slate-200 font-mono">
                {assignedVehicle.current_engine_hours.toLocaleString()} hrs
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Formulario Registro Odómetro */}
      {assignedVehicle && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Gauge className="w-5 h-5 text-amber-400" />
            Actualización de Lecturas diarias
          </h3>

          <form onSubmit={handleUpdateOdometer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nuevo Kilometraje (KM)
                </label>
                <input
                  type="number"
                  min={assignedVehicle.current_mileage}
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-amber-500 focus:outline-none"
                  placeholder={assignedVehicle.current_mileage.toString()}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nuevas Horas Motor
                </label>
                <input
                  type="number"
                  min={assignedVehicle.current_engine_hours}
                  value={hours}
                  onChange={(e) => setHours(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono focus:border-amber-500 focus:outline-none"
                  placeholder={assignedVehicle.current_engine_hours.toString()}
                  required
                />
              </div>
            </div>

            {message && (
              <div className="p-3 rounded-xl bg-slate-950 text-xs font-medium text-slate-200 border border-slate-800">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition active:scale-95 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Lecturas'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};