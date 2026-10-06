import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  X,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Truck,
  Shield,
  Loader2,
  Calendar,
} from 'lucide-react';
import { downloadFleetMaintenancePDF } from '../../utils/pdfGenerator.ts';
import type { Vehicle, MaintenancePlan, Issue, VehicleMaintenanceHealth } from '../../types/truckio.ts';
import confetti from 'canvas-confetti';

interface FleetReportPDFModalProps {
  vehicles: Vehicle[];
  plans: MaintenancePlan[];
  issues: Issue[];
  healthMap: Record<string, VehicleMaintenanceHealth>;
  onClose: () => void;
}

export const FleetReportPDFModal: React.FC<FleetReportPDFModalProps> = ({
  vehicles,
  plans,
  issues,
  healthMap,
  onClose,
}) => {
  const [includeResolved, setIncludeResolved] = useState(false);
  const [generating, setGenerating] = useState(false);

  const pendingIssues = issues.filter((i) => i.status !== 'resolved');
  const stoppedIssues = pendingIssues.filter((i) => i.mobility === 'stopped');

  const greenCount = vehicles.filter((v) => healthMap[v.id]?.status === 'green').length;
  const yellowCount = vehicles.filter((v) => healthMap[v.id]?.status === 'yellow').length;
  const redCount = vehicles.filter((v) => healthMap[v.id]?.status === 'red').length;

  const handleDownload = () => {
    setGenerating(true);
    try {
      downloadFleetMaintenancePDF(vehicles, plans, issues, healthMap, {
        includeResolvedIssues: includeResolved,
      });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.3 },
      });
    } catch (err: any) {
      alert('Error al generar el PDF: ' + (err.message || 'Error desconocido'));
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-4xl w-full my-6 p-6 sm:p-8 text-slate-100 shadow-2xl relative print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Header (Hidden in Print) */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-white">Resumen Ejecutivo de Mantenimiento e Incidencias</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                  PDF OFICIAL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Informe formal descargable para auditorías técnicas y gestión de flota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{generating ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Options Toolbar (Hidden in Print) */}
        <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Opciones de exportación:</span>
            <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={includeResolved}
                onChange={(e) => setIncludeResolved(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 bg-slate-950 border-slate-700"
              />
              <span className="text-slate-300">Incluir también incidencias históricas resueltas</span>
            </label>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>Fecha de corte: {new Date().toLocaleDateString('es-AR')}</span>
          </div>
        </div>

        {/* Report Content Preview (matches PDF structure) */}
        <div className="space-y-6 text-xs">
          {/* Header Card */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="text-xl font-black font-mono text-white">
                TRUCKIO <span className="text-amber-400">FLEET REPORT</span>
              </div>
              <p className="text-slate-300 font-semibold mt-0.5">Transportes Aconcagua S.A. • CUIT: 30-71289456-4</p>
              <p className="text-slate-400 text-[11px]">
                Gestora Responsable: Ing. Mariana Rossi • Estado al {new Date().toLocaleDateString('es-AR')}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Flota Total</span>
                <span className="font-mono text-base font-black text-white">{vehicles.length} unidades</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-red-500/15 border border-red-500/30 text-center">
                <span className="text-[10px] text-red-400 uppercase font-bold block">Incidencias Abiertas</span>
                <span className="font-mono text-base font-black text-red-400">{pendingIssues.length}</span>
              </div>
            </div>
          </div>

          {/* Semaphoric Status Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-emerald-400 text-xs">🟢 EN REGLA (&gt;15%)</span>
                <span className="font-mono font-bold text-white text-sm">{greenCount}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Unidades con margen seguro para operar sin riesgo de servicio preventivo vencido.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-amber-400 text-xs">🟡 ALERTA PREVENTIVA (≤15%)</span>
                <span className="font-mono font-bold text-white text-sm">{yellowCount}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Unidades dentro del umbral de aviso. Requieren agendamiento próximo de taller.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-red-400 text-xs">🔴 CRÍTICO / VENCIDO</span>
                <span className="font-mono font-bold text-white text-sm">{redCount}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {stoppedIssues.length > 0
                  ? `Incluye ${stoppedIssues.length} unidad(es) parada(s) en ruta por avería severa.`
                  : 'Unidades con kilometraje u horas excedidas respecto al plan.'}
              </p>
            </div>
          </div>

          {/* Pending Issues Section */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>Incidencias Operativas Pendientes ({pendingIssues.length})</span>
              </h4>
              {stoppedIssues.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-black text-[10px] uppercase animate-pulse">
                  {stoppedIssues.length} UNIDAD(ES) PARADA(S)
                </span>
              )}
            </div>

            {pendingIssues.length === 0 ? (
              <p className="text-slate-400 text-xs italic py-2">
                No hay incidencias pendientes registradas. Toda la flota se encuentra operativa.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingIssues.map((iss) => {
                  const v = vehicles.find((veh) => veh.id === iss.vehicle_id);
                  return (
                    <div
                      key={iss.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        iss.mobility === 'stopped'
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-amber-400">[{v?.license_plate}]</span>
                          <span className="font-bold text-white">{iss.title}</span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 uppercase font-semibold">
                            {iss.status}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">{iss.description}</p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1.5">
                          <span>Ubicación: {iss.city || 'En ruta'}</span>
                          <span>Taller: {iss.assigned_workshop || 'Pendiente'}</span>
                          {iss.repair_cost && (
                            <span className="font-mono text-amber-400 font-bold">
                              ${iss.repair_cost.toLocaleString('es-AR')} ARS
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`text-[10px] font-black px-2 py-1 rounded-md uppercase ${
                            iss.mobility === 'stopped'
                              ? 'bg-red-600 text-white'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {iss.mobility === 'stopped' ? '🔴 PARADA' : '🟢 EN MARCHA'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Vehicle Fleet Health Table Summary */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="font-bold text-sm text-white mb-3 flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-400" />
              <span>Estado Semafórico de Mantenimiento por Unidad (10)</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2">Patente</th>
                    <th className="py-2">Tipo</th>
                    <th className="py-2">Marca y Modelo</th>
                    <th className="py-2 text-right">Odómetro</th>
                    <th className="py-2 text-center">Margen</th>
                    <th className="py-2">Semáforo</th>
                    <th className="py-2">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {vehicles.map((v) => {
                    const health = healthMap[v.id];
                    return (
                      <tr key={v.id} className="hover:bg-slate-900/50">
                        <td className="py-2 font-mono font-bold text-amber-400">{v.license_plate}</td>
                        <td className="py-2 text-slate-400">{v.type === 'truck' ? 'Tractor' : 'Remolque'}</td>
                        <td className="py-2 text-white font-medium">
                          {v.brand} {v.model}
                        </td>
                        <td className="py-2 text-right font-mono text-slate-300">
                          {v.current_mileage.toLocaleString()} km
                        </td>
                        <td className="py-2 text-center font-mono font-bold text-slate-200">
                          {health?.minRemainingPercentage}%
                        </td>
                        <td className="py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              health?.status === 'green'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : health?.status === 'yellow'
                                ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400 font-black'
                            }`}
                          >
                            {health?.status === 'green'
                              ? '🟢 Verde'
                              : health?.status === 'yellow'
                              ? '🟡 Amarillo'
                              : '🔴 Rojo'}
                          </span>
                        </td>
                        <td className="py-2 text-slate-400 text-[11px] truncate max-w-xs">{health?.reason}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="mt-6 pt-5 border-t border-slate-800 flex items-center justify-between print:hidden">
          <span className="text-xs text-slate-400">
            El archivo generado incluye encabezado institucional, tablas formateadas con saltos de página y firmas de responsabilidad técnica.
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
            >
              Cerrar
            </button>

            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition active:scale-95 disabled:opacity-50"
            >
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{generating ? 'Generando PDF...' : 'Descargar PDF Oficial'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
