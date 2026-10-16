import React, { useState, useEffect } from 'react';
import { UserCheck, Truck, Car, X, ShieldAlert } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import type { User, Vehicle } from '../../types/truckio';

interface AssignVehicleModalProps {
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignVehicleModal: React.FC<AssignVehicleModalProps> = ({
  tenantId,
  onClose,
  onSuccess,
}) => {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedTruckId, setSelectedTruckId] = useState<string>('');
  const [selectedTrailerId, setSelectedTrailerId] = useState<string>('');
  const [startKm, setStartKm] = useState<number | ''>('');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const allUsers = await StorageService.getUsers(tenantId);
      // Filtramos solo los usuarios que tienen rol de chofer
      const driverList = allUsers.filter((u) => u.role === 'driver');
      setDrivers(driverList);

      const allVehicles = await StorageService.getVehicles(tenantId);
      setVehicles(allVehicles.filter((v) => v.is_active));
    } catch (err: any) {
      setError('Error al cargar datos para asignación: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverId) {
      setError('Debe seleccionar un chofer.');
      return;
    }
    if (!selectedTruckId) {
      setError('Debe seleccionar al menos un tractor / camión principal.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Llamamos al servicio de asignación de viaje/recurso
      await StorageService.assignTrip({
        driverUserId: selectedDriverId,
        truckId: selectedTruckId,
        trailerId: selectedTrailerId || '',
        startOdometer: startKm === '' ? 0 : Number(startKm),
      });

      onSuccess();
    } catch (err: any) {
      setError('Error al realizar la asignación: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const trucks = vehicles.filter((v) => v.type === 'truck');
  const trailers = vehicles.filter((v) => v.type === 'trailer');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full my-6 p-6 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <UserCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Asignación Operativa de Unidades</h3>
              <p className="text-xs text-slate-400">Vincular chofer con tractor y remolque(s)</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Cargando recursos disponibles...</div>
        ) : (
          <form onSubmit={handleAssign} className="space-y-4 text-xs">
            {/* Selección de Chofer */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                Seleccionar Chofer *
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">-- Seleccione un chofer habilitado --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} ({d.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de Tractor / Camión Principal */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                Tractor / Camión Principal *
              </label>
              <select
                value={selectedTruckId}
                onChange={(e) => setSelectedTruckId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                required
              >
                <option value="">-- Seleccione tractor --</option>
                {trucks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.license_plate}] {t.brand} {t.model}
                  </option>
                ))}
              </select>
            </div>

            {/* Selección de Remolque / Acoplado (Opcional) */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                Remolque / Acoplado / Batea (Opcional)
              </label>
              <select
                value={selectedTrailerId}
                onChange={(e) => setSelectedTrailerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              >
                <option value="">-- Sin remolque asociado --</option>
                {trailers.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    [{tr.license_plate}] {tr.brand} {tr.model}
                  </option>
                ))}
              </select>
            </div>

            {/* Kilometraje Inicial de Partida */}
            <div>
              <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
                Kilometraje Inicial de Partida (Odometer)
              </label>
              <input
                type="number"
                min="0"
                placeholder="Ej: 142500"
                value={startKm}
                onChange={(e) => setStartKm(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Nota informativa */}
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Esta acción registrará formalmente la asignación operativa en el sistema. Los vehículos creados previamente permanecen libres hasta que se ejecute este proceso.
              </span>
            </div>

            {/* Botones de Acción */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition shadow-md"
              >
                {saving ? 'Asignando...' : 'Confirmar Asignación'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};