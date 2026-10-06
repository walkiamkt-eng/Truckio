import React, { useState, useEffect } from 'react';
import { Gauge, Clock, CheckCircle2, AlertTriangle, X, Check, Wrench, ChevronRight } from 'lucide-react';
import { StorageService } from '../../services/storageService.ts';
import type { Vehicle, User, MaintenancePlan } from '../../types/truckio.ts';
import confetti from 'canvas-confetti';

interface OdometerFormProps {
  vehicles: Vehicle[];
  currentUser: User;
  onSuccess: () => void;
  onCancel?: () => void;
  preselectedVehicleId?: string;
}

export const OdometerForm: React.FC<OdometerFormProps> = ({
  vehicles,
  currentUser,
  onSuccess,
  onCancel,
  preselectedVehicleId,
}) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    preselectedVehicleId || vehicles[0]?.id || ''
  );
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  const [mileage, setMileage] = useState<number>(selectedVehicle?.current_mileage || 0);
  const [hours, setHours] = useState<number>(selectedVehicle?.current_engine_hours || 0);
  const [plans, setPlans] = useState<MaintenancePlan[]>([]);
  const [completedPlanIds, setCompletedPlanIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // Sync inputs when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      setMileage(selectedVehicle.current_mileage);
      setHours(selectedVehicle.current_engine_hours);
      StorageService.getPlansByVehicle(selectedVehicle.id).then(setPlans);
    }
  }, [selectedVehicleId]);

  const togglePlanCompleted = (planId: string) => {
    if (completedPlanIds.includes(planId)) {
      setCompletedPlanIds(completedPlanIds.filter((id) => id !== planId));
    } else {
      setCompletedPlanIds([...completedPlanIds, planId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    setSubmitting(true);
    setMessage(null);

    try {
      // 1. Update mileage & hours with Last-Write-Wins logic
      const updateResult = await StorageService.updateOdometerAndHours(
        selectedVehicle.id,
        Number(mileage),
        Number(hours),
        currentUser.id
      );

      // 2. Mark any completed maintenance plans
      for (const planId of completedPlanIds) {
        const plan = plans.find((p) => p.id === planId);
        const serviceVal = plan?.trigger_type === 'mileage' ? Number(mileage) : Number(hours);
        await StorageService.recordMaintenanceServiceDone(planId, serviceVal);
      }

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });

      setMessage({
        type: 'success',
        text: updateResult.message + (completedPlanIds.length > 0 ? ` (Se registraron ${completedPlanIds.length} mantenimientos cumplidos)` : ''),
      });

      setTimeout(() => {
        onSuccess();
      }, 1200);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: 'Error al actualizar: ' + (err.message || 'Error desconocido'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-xl max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Gauge className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Registrar Odómetro y Mantenimiento</h2>
            <p className="text-xs text-slate-400">Actualización en ruta de kilometraje y servicios realizados</p>
          </div>
        </div>
        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {message && (
        <div
          className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : message.type === 'warning'
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
              : 'bg-red-500/15 border-red-500/30 text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de Unidad */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
            Seleccionar Unidad (Camión o Remolque)
          </label>
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                [{v.type === 'truck' ? 'Tractor' : 'Remolque'}] {v.license_plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>

        {/* Inputs Odómetro y Horas Motor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-amber-400" />
                Odómetro Actual (km)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Anterior: {selectedVehicle?.current_mileage.toLocaleString()} km
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="1"
                required
                value={mileage}
                onChange={(e) => setMileage(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xl font-bold font-mono text-white focus:outline-none focus:border-amber-500"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-bold">KM</span>
            </div>
            {selectedVehicle && mileage < selectedVehicle.current_mileage && (
              <p className="text-[11px] text-amber-400 mt-1.5 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Valor menor al actual. Se aplicará política Last-Write-Wins.
              </p>
            )}
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                Horas Motor (hs)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Anterior: {selectedVehicle?.current_engine_hours.toLocaleString()} hs
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.1"
                required
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-xl font-bold font-mono text-white focus:outline-none focus:border-blue-500"
              />
              <span className="absolute right-3.5 top-3.5 text-xs text-slate-500 font-bold">HS</span>
            </div>
            {selectedVehicle?.type === 'trailer' && selectedVehicle.brand !== 'Bonano' && (
              <p className="text-[11px] text-slate-500 mt-1.5">
                Los remolques sin equipo de frío suelen registrar 0 horas motor.
              </p>
            )}
          </div>
        </div>

        {/* Planes Preventivos Asociados a Esta Unidad */}
        {plans.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
              ¿Realizaste alguno de estos servicios programados?
            </label>
            <div className="space-y-2">
              {plans.map((p) => {
                const isSelected = completedPlanIds.includes(p.id);
                const nextVal = p.last_service_value + p.target_value;
                const currentVal = p.trigger_type === 'mileage' ? mileage : hours;
                const remaining = nextVal - currentVal;

                return (
                  <div
                    key={p.id}
                    onClick={() => togglePlanCompleted(p.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/40'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs flex items-center gap-2">
                        <span>{p.title}</span>
                        {remaining <= 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                            VENCIDO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Meta cada {p.target_value.toLocaleString()} {p.trigger_type === 'mileage' ? 'km' : 'hs'} |{' '}
                        {remaining > 0 ? `Restan ${remaining.toLocaleString()} ${p.trigger_type === 'mileage' ? 'km' : 'hs'}` : `Excedido por ${Math.abs(remaining).toLocaleString()}`}
                      </div>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center border transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                          : 'border-slate-700 bg-slate-900 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold text-xs"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Guardar Lectura de Odómetro</span>
          </button>
        </div>
      </form>
    </div>
  );
};
