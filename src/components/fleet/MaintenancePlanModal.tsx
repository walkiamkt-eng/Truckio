import React, { useState } from 'react';
import { Wrench, Gauge, Clock, Calendar, CheckCircle2, X } from 'lucide-react';
import { StorageService } from '../../services/storageService.ts';
import type { Vehicle, MaintenanceTriggerType } from '../../types/truckio.ts';

interface MaintenancePlanModalProps {
  vehicles: Vehicle[];
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
  defaultVehicleId?: string;
}

export const MaintenancePlanModal: React.FC<MaintenancePlanModalProps> = ({
  vehicles,
  tenantId,
  onClose,
  onSuccess,
  defaultVehicleId,
}) => {
  const [vehicleId, setVehicleId] = useState<string>(defaultVehicleId || vehicles[0]?.id || '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<MaintenanceTriggerType>('mileage');
  const [targetValue, setTargetValue] = useState<number | ''>(40000);
  const [lastServiceValue, setLastServiceValue] = useState<number | ''>(0);
  const [lastServiceDate, setLastServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) {
      setError('Debes seleccionar un vehículo.');
      return;
    }
    if (!title.trim()) {
      setError('El título de la tarea preventiva es obligatorio.');
      return;
    }
    if (targetValue === '' || Number(targetValue) <= 0) {
      setError('El intervalo meta debe ser mayor a 0.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await StorageService.createMaintenancePlan({
        tenant_id: tenantId,
        vehicle_id: vehicleId,
        title: title.trim(),
        description: description.trim() || undefined,
        trigger_type: triggerType,
        target_value: Number(targetValue),
        last_service_value: lastServiceValue === '' ? 0 : Number(lastServiceValue),
        last_service_date: lastServiceDate || undefined,
      });

      onSuccess();
    } catch (err: any) {
      setError('Error al crear plan: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full my-6 p-6 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Wrench className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Nueva Regla de Mantenimiento Preventivo</h3>
              <p className="text-xs text-slate-400">Control semafórico por kilometraje, horas o calendario</p>
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Vehículo Asignado */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
              Vehículo Asignado *
            </label>
            <select
              value={vehicleId}
              onChange={(e) => {
                const nextId = e.target.value;
                setVehicleId(nextId);
                const veh = vehicles.find((v) => v.id === nextId);
                if (veh && triggerType === 'mileage') {
                  setLastServiceValue(veh.current_mileage);
                }
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
            >
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  [{v.license_plate}] {v.brand} {v.model} ({v.current_mileage.toLocaleString()} km)
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Disparador */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
              Disparador de la Regla (Trigger)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setTriggerType('mileage');
                  if (targetValue === 500 || targetValue === 365) setTargetValue(40000);
                  if (selectedVehicle) setLastServiceValue(selectedVehicle.current_mileage);
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center border text-center transition ${
                  triggerType === 'mileage'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Gauge className="w-4 h-4 mb-1" />
                <span>Kilómetros</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTriggerType('engine_hours');
                  if (targetValue === 40000 || targetValue === 365) setTargetValue(500);
                  if (selectedVehicle) setLastServiceValue(selectedVehicle.current_engine_hours);
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center border text-center transition ${
                  triggerType === 'engine_hours'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Clock className="w-4 h-4 mb-1" />
                <span>Horas Motor</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTriggerType('time_interval');
                  if (targetValue === 40000 || targetValue === 500) setTargetValue(365);
                  setLastServiceValue(0);
                }}
                className={`p-2.5 rounded-xl font-bold flex flex-col items-center justify-center border text-center transition ${
                  triggerType === 'time_interval'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4 mb-1" />
                <span>Días (Tiempo)</span>
              </button>
            </div>
          </div>

          {/* Título de la tarea */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
              Título de la Tarea Preventiva *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Cambio de Aceite Sintético y Filtros, Rotación de Neumáticos, VTV Anual"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Frecuencia Meta y Último Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Frecuencia / Intervalo Meta *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-500 font-bold">
                  {triggerType === 'mileage' ? 'KM' : triggerType === 'engine_hours' ? 'HS' : 'DÍAS'}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Lectura Último Servicio
              </label>
              <input
                type="number"
                min="0"
                value={lastServiceValue}
                onChange={(e) => setLastServiceValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
              Fecha de Último Servicio Realizado
            </label>
            <input
              type="date"
              value={lastServiceDate}
              onChange={(e) => setLastServiceDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
              Descripción / Protocolo Técnico
            </label>
            <textarea
              rows={2}
              placeholder="Instrucciones específicas, especificación de lubricantes o repuestos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Actions */}
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
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-md"
            >
              {saving ? 'Guardando...' : 'Crear Plan Preventivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
