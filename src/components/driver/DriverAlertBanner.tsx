import React from 'react';
import { AlertTriangle, Wrench, ShieldAlert } from 'lucide-react';
import type { Vehicle, MaintenancePlan, Issue } from '../../types/truckio.ts';

interface DriverAlertBannerProps {
  assignedVehicle?: Vehicle | null;
  maintenancePlans?: MaintenancePlan[];
  issues?: Issue[];
  onOpenReportModal?: () => void;
}

export const DriverAlertBanner: React.FC<DriverAlertBannerProps> = ({
  assignedVehicle,
  maintenancePlans = [], // Se asigna arreglo vacío por defecto
  issues = [],           // Se asigna arreglo vacío por defecto
  onOpenReportModal,
}) => {
  if (!assignedVehicle) return null;

  // Se asegura que maintenancePlans e issues sean arreglos válidos antes de hacer .find()
  const activePlans = Array.isArray(maintenancePlans) ? maintenancePlans : [];
  const activeIssues = Array.isArray(issues) ? issues : [];

  // Buscar plan de mantenimiento vencido o próximo
  const overduePlan = activePlans.find((plan) => {
    if (plan.vehicle_id !== assignedVehicle.id) return false;
    const isMileageOverdue =
      plan.next_service_mileage && assignedVehicle.current_mileage >= plan.next_service_mileage;
    const isDateOverdue =
      plan.next_service_date && new Date(plan.next_service_date) <= new Date();
    return isMileageOverdue || isDateOverdue;
  });

  // Buscar si hay una incidencia abierta/crítica para el vehículo
  const criticalIssue = activeIssues.find(
    (issue) =>
      issue.vehicle_id === assignedVehicle.id &&
      issue.status !== 'resolved' &&
      issue.status !== 'closed' &&
      (issue.severity === 'critical' || issue.severity === 'high')
  );

  if (!overduePlan && !criticalIssue) return null;

  return (
    <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 mt-0.5 sm:mt-0">
            {criticalIssue ? <ShieldAlert className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              {criticalIssue ? 'Atención: Incidencia Reportada' : 'Mantenimiento Pendiente'}
            </h4>
            <p className="text-xs text-amber-200/80 mt-0.5">
              {criticalIssue
                ? `Hay una incidencia registrada (${criticalIssue.title}) que requiere revisión.`
                : `El vehículo requiere servicio preventivo pronto (${overduePlan?.service_type || 'Mantenimiento'}).`}
            </p>
          </div>
        </div>

        {onOpenReportModal && (
          <button
            onClick={onOpenReportModal}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition active:scale-95 shrink-0 flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Reportar Novedad
          </button>
        )}
      </div>
    </div>
  );
};