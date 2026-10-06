import React, { useState } from 'react';
import { Wrench, Plus, CheckCircle2, Clock, Gauge, Calendar, AlertTriangle } from 'lucide-react';
import { MaintenancePlanModal } from './MaintenancePlanModal.tsx';
import { StorageService } from '../../services/storageService.ts';
import type { Vehicle, MaintenancePlan, User } from '../../types/truckio.ts';
import confetti from 'canvas-confetti';

interface PlansManagerProps {
  vehicles: Vehicle[];
  plans: MaintenancePlan[];
  currentUser: User;
  onRefresh: () => void;
}

export const PlansManager: React.FC<PlansManagerProps> = ({
  vehicles,
  plans,
  currentUser,
  onRefresh,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [recordingServiceId, setRecordingServiceId] = useState<string | null>(null);
  const [serviceValue, setServiceValue] = useState<number | ''>('');
  const [serviceDate, setServiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleMarkDone = async (plan: MaintenancePlan) => {
    const v = vehicles.find((veh) => veh.id === plan.vehicle_id);
    const defaultVal =
      plan.trigger_type === 'mileage'
        ? v?.current_mileage || 0
        : plan.trigger_type === 'engine_hours'
        ? v?.current_engine_hours || 0
        : 0;

    setRecordingServiceId(plan.id);
    setServiceValue(defaultVal);
  };

  const submitServiceDone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingServiceId) return;

    setSaving(true);
    try {
      await StorageService.recordMaintenanceServiceDone(
        recordingServiceId,
        serviceValue === '' ? 0 : Number(serviceValue),
        serviceDate
      );

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.5 },
      });

      setRecordingServiceId(null);
      onRefresh();
    } catch (err: any) {
      alert('Error al registrar mantenimiento: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
            <Wrench className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Planes de Mantenimiento Preventivo</h2>
            <p className="text-xs text-slate-400">
              Reglas periódicas de cambio de fluidos, filtros, neumáticos e inspecciones reglamentarias
            </p>
          </div>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-md transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Regla Preventiva</span>
        </button>
      </div>

      {/* Plans List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const v = vehicles.find((veh) => veh.id === plan.vehicle_id);
          let currentVal = 0;
          if (v) {
            currentVal = plan.trigger_type === 'mileage' ? v.current_mileage : v.current_engine_hours;
          }
          const nextDue = plan.last_service_value + plan.target_value;
          const remaining = nextDue - currentVal;
          const percentRemaining = plan.target_value > 0 ? (remaining / plan.target_value) * 100 : 100;
          const isOverdue = remaining <= 0;
          const isWarning = remaining > 0 && percentRemaining <= 15;

          return (
            <div
              key={plan.id}
              className={`bg-slate-900 border rounded-2xl p-5 text-slate-100 flex flex-col justify-between transition shadow-md ${
                isOverdue
                  ? 'border-red-500/50 shadow-red-950/20'
                  : isWarning
                  ? 'border-amber-500/50 shadow-amber-950/20'
                  : 'border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-bold text-amber-400">
                    [{v?.license_plate || 'Unidad'}] {v?.brand}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isOverdue
                        ? 'bg-red-500/20 text-red-400'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {isOverdue ? '¡VENCIDO!' : isWarning ? 'ALERTA (≤15%)' : 'EN REGLA'}
                  </span>
                </div>

                <h3 className="font-bold text-sm text-white mb-1">{plan.title}</h3>
                <p className="text-xs text-slate-400 mb-3">{plan.description || 'Sin notas adicionales.'}</p>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                    <span>Frecuencia: cada {plan.target_value.toLocaleString()} {plan.trigger_type === 'mileage' ? 'km' : 'hs'}</span>
                    <span className="font-mono font-bold text-white">
                      {remaining > 0 ? `Restan ${remaining.toLocaleString()}` : `Excedido por ${Math.abs(remaining).toLocaleString()}`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isOverdue ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, percentRemaining))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Último Realizado:</span>
                    <span className="font-mono font-semibold text-slate-300">
                      {plan.last_service_value.toLocaleString()} ({plan.last_service_date || 'Inicial'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Próximo Service:</span>
                    <span className="font-mono font-bold text-amber-400">
                      {nextDue.toLocaleString()} {plan.trigger_type === 'mileage' ? 'km' : 'hs'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleMarkDone(plan)}
                className="mt-4 w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Registrar Service Cumplido</span>
              </button>
            </div>
          );
        })}
      </div>

      {modalOpen && (
        <MaintenancePlanModal
          vehicles={vehicles}
          tenantId={currentUser.tenant_id}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            onRefresh();
          }}
        />
      )}

      {/* Record Service Done Modal */}
      {recordingServiceId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2">Registrar Service de Mantenimiento Realizado</h3>
            <p className="text-xs text-slate-400 mb-4">
              Actualiza la fecha y lectura para resetear el contador de mantenimiento preventivo.
            </p>

            <form onSubmit={submitServiceDone} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Kilometraje u Horas al momento del servicio *
                </label>
                <input
                  type="number"
                  required
                  value={serviceValue}
                  onChange={(e) => setServiceValue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Fecha del Servicio *</label>
                <input
                  type="date"
                  required
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordingServiceId(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
                >
                  {saving ? 'Guardando...' : 'Confirmar Cumplimiento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
