import React, { useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Wrench,
  CheckCircle2,
  ChevronRight,
  MapPin,
  Camera,
  DollarSign,
  User as UserIcon,
  X,
  Filter,
} from 'lucide-react';
import { StorageService } from '../../services/storageService.ts';
import type { Issue, Vehicle, User, IssueStatus } from '../../types/truckio.ts';
import confetti from 'canvas-confetti';

interface IncidentBoardProps {
  issues: Issue[];
  vehicles: Vehicle[];
  users: User[];
  onRefresh: () => void;
}

export const IncidentBoard: React.FC<IncidentBoardProps> = ({
  issues,
  vehicles,
  users,
  onRefresh,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterMobility, setFilterMobility] = useState<string>('all');

  // Form fields inside transition modal
  const [workshop, setWorkshop] = useState('');
  const [cost, setCost] = useState<number | ''>('');
  const [repairNotes, setRepairNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Filtered issues
  const filteredIssues = issues.filter((iss) => {
    if (filterSeverity !== 'all' && iss.severity !== filterSeverity) return false;
    if (filterMobility !== 'all' && iss.mobility !== filterMobility) return false;
    return true;
  });

  const columns: { id: IssueStatus; title: string; icon: any; color: string; badgeColor: string }[] = [
    {
      id: 'reported',
      title: 'Reportado por Chofer',
      icon: AlertTriangle,
      color: 'border-blue-500/30 bg-blue-950/20 text-blue-400',
      badgeColor: 'bg-blue-500/20 text-blue-300',
    },
    {
      id: 'under_review',
      title: 'En Revisión Técnica',
      icon: Clock,
      color: 'border-amber-500/30 bg-amber-950/20 text-amber-400',
      badgeColor: 'bg-amber-500/20 text-amber-300',
    },
    {
      id: 'in_workshop',
      title: 'En Taller / Reparación',
      icon: Wrench,
      color: 'border-purple-500/30 bg-purple-950/20 text-purple-400',
      badgeColor: 'bg-purple-500/20 text-purple-300',
    },
    {
      id: 'resolved',
      title: 'Resuelto / Cerrado',
      icon: CheckCircle2,
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-400',
      badgeColor: 'bg-emerald-500/20 text-emerald-300',
    },
  ];

  const handleOpenDetail = (issue: Issue) => {
    setSelectedIssue(issue);
    setWorkshop(issue.assigned_workshop || '');
    setCost(issue.repair_cost || '');
    setRepairNotes(issue.repair_notes || '');
  };

  const handleMoveStatus = async (targetStatus: IssueStatus) => {
    if (!selectedIssue) return;
    setUpdating(true);
    try {
      await StorageService.updateIssueStatus(selectedIssue.id, targetStatus, {
        assigned_workshop: workshop || undefined,
        repair_cost: cost !== '' ? Number(cost) : undefined,
        repair_notes: repairNotes || undefined,
      });

      if (targetStatus === 'resolved') {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.5 },
        });
      }

      onRefresh();
      setSelectedIssue(null);
    } catch (err: any) {
      alert('Error al actualizar estado: ' + (err.message || 'Error desconocido'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-amber-400" />
          <div>
            <h2 className="text-base font-bold text-white">Ciclo de Vida de Incidencias</h2>
            <p className="text-xs text-slate-400">
              Flujo operativo de derivación a taller, control de costos y cierre
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtros:</span>
          </div>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todas las severidades</option>
            <option value="critical">Crítica</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Leve</option>
          </select>

          <select
            value={filterMobility}
            onChange={(e) => setFilterMobility(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">Todo estado de marcha</option>
            <option value="stopped">🔴 Unidad Parada</option>
            <option value="running">🟢 Sigue en Marcha</option>
          </select>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const colIssues = filteredIssues.filter((i) => i.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl flex flex-col min-h-[500px]"
            >
              {/* Column Header */}
              <div className={`p-4 border-b border-slate-800 rounded-t-2xl flex items-center justify-between ${col.color}`}>
                <div className="flex items-center gap-2">
                  <ColIcon className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wider">{col.title}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badgeColor}`}>
                  {colIssues.length}
                </span>
              </div>

              {/* Column Cards */}
              <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[650px]">
                {colIssues.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-xs text-slate-500 italic">
                    Sin incidencias en esta etapa
                  </div>
                ) : (
                  colIssues.map((issue) => {
                    const vehicle = vehicles.find((v) => v.id === issue.vehicle_id);
                    const reporter = users.find((u) => u.id === issue.reported_by_user_id);

                    return (
                      <div
                        key={issue.id}
                        onClick={() => handleOpenDetail(issue)}
                        className={`p-3.5 rounded-xl bg-slate-950 border cursor-pointer transition hover:border-amber-500/60 hover:shadow-lg text-slate-200 ${
                          issue.mobility === 'stopped'
                            ? 'border-red-500/40 shadow-red-950/20'
                            : 'border-slate-800'
                        }`}
                      >
                        {/* Header: License plate & mobility */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-black text-amber-400">
                            {vehicle?.license_plate || 'Unidad'}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              issue.mobility === 'stopped'
                                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {issue.mobility === 'stopped' ? '🔴 PARADA' : '🟢 EN MARCHA'}
                          </span>
                        </div>

                        <h4 className="font-bold text-xs text-white line-clamp-2 leading-snug mb-1">
                          {issue.title}
                        </h4>

                        <p className="text-[11px] text-slate-400 line-clamp-2 mb-2.5">
                          {issue.description}
                        </p>

                        {/* Extra metadata */}
                        <div className="pt-2 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                          {issue.city && (
                            <div className="flex items-center gap-1 truncate text-slate-400">
                              <MapPin className="w-3 h-3 flex-shrink-0 text-slate-500" />
                              <span>{issue.city}</span>
                            </div>
                          )}

                          {issue.assigned_workshop && (
                            <div className="flex items-center gap-1 truncate text-purple-300 font-medium">
                              <Wrench className="w-3 h-3 flex-shrink-0" />
                              <span>{issue.assigned_workshop}</span>
                            </div>
                          )}

                          {issue.repair_cost && (
                            <div className="flex items-center gap-1 font-bold text-amber-400">
                              <DollarSign className="w-3 h-3 flex-shrink-0" />
                              <span>${issue.repair_cost.toLocaleString('es-AR')} ARS</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-1.5 border-t border-slate-900">
                          <span>{new Date(issue.created_at).toLocaleDateString('es-AR')}</span>
                          {issue.attachments && issue.attachments.length > 0 && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Camera className="w-3 h-3" />
                              {issue.attachments.length} foto(s)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Incident Detail & Status Progression Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full my-6 p-6 text-slate-100 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                    selectedIssue.mobility === 'stopped' ? 'bg-red-600' : 'bg-emerald-600'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-amber-400">
                      {vehicles.find((v) => v.id === selectedIssue.vehicle_id)?.license_plate}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold uppercase">
                      Severidad: {selectedIssue.severity}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white leading-tight mt-0.5">
                    {selectedIssue.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedIssue(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Incident Information */}
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                  Descripción de la Falla Reportada por Chofer
                </span>
                <p className="text-slate-300 text-xs leading-relaxed">{selectedIssue.description}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Movilidad Unidad</span>
                  <span
                    className={`font-bold mt-0.5 block ${
                      selectedIssue.mobility === 'stopped' ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {selectedIssue.mobility === 'stopped' ? '🔴 Unidad Parada' : '🟢 Sigue en Marcha'}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Ubicación</span>
                  <span className="font-bold text-white mt-0.5 block truncate">
                    {selectedIssue.city || 'En ruta'} {selectedIssue.state ? `(${selectedIssue.state})` : ''}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Fecha de Reporte</span>
                  <span className="font-bold text-white mt-0.5 block">
                    {new Date(selectedIssue.created_at).toLocaleDateString('es-AR')}{' '}
                    {new Date(selectedIssue.created_at).toLocaleTimeString('es-AR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Photos Gallery */}
              {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block mb-2 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-amber-400" />
                    Fotos de Evidencia ({selectedIssue.attachments.length})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedIssue.attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl overflow-hidden border border-slate-800 aspect-video bg-black"
                      >
                        <img
                          src={att.file_url}
                          alt="Evidencia daño"
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition"
                          onClick={() => window.open(att.file_url, '_blank')}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workshop & Cost Assignment Section */}
              <div className="pt-3 border-t border-slate-800 space-y-3 bg-slate-950/80 p-4 rounded-2xl border">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Gestión de Reparación & Taller Mecánico
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Taller o Prestador Asignado
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Scania Oficial Rosario / Taller Norte"
                      value={workshop}
                      onChange={(e) => setWorkshop(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                      Costo Total de Reparación (ARS $)
                    </label>
                    <input
                      type="number"
                      placeholder="Ej: 185000"
                      value={cost}
                      onChange={(e) => setCost(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1 font-semibold">
                    Notas de Trabajo Realizado / Repuestos
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Detalle de repuestos cambiados, mano de obra, garantía..."
                    value={repairNotes}
                    onChange={(e) => setRepairNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              </div>

              {/* Progression Action Buttons */}
              <div className="pt-4 border-t border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold block mb-2">
                  Transicionar Estado de la Incidencia:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    disabled={updating || selectedIssue.status === 'reported'}
                    onClick={() => handleMoveStatus('reported')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      selectedIssue.status === 'reported'
                        ? 'bg-blue-600 text-white border-blue-500 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                    }`}
                  >
                    1. Reportado
                  </button>

                  <button
                    type="button"
                    disabled={updating || selectedIssue.status === 'under_review'}
                    onClick={() => handleMoveStatus('under_review')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      selectedIssue.status === 'under_review'
                        ? 'bg-amber-600 text-slate-950 border-amber-500 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                    }`}
                  >
                    2. En Revisión
                  </button>

                  <button
                    type="button"
                    disabled={updating || selectedIssue.status === 'in_workshop'}
                    onClick={() => handleMoveStatus('in_workshop')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      selectedIssue.status === 'in_workshop'
                        ? 'bg-purple-600 text-white border-purple-500 font-black'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700'
                    }`}
                  >
                    3. En Taller
                  </button>

                  <button
                    type="button"
                    disabled={updating || selectedIssue.status === 'resolved'}
                    onClick={() => handleMoveStatus('resolved')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition ${
                      selectedIssue.status === 'resolved'
                        ? 'bg-emerald-600 text-white border-emerald-500 font-black'
                        : 'bg-slate-800 text-emerald-400 hover:bg-emerald-950/40 border-slate-700'
                    }`}
                  >
                    4. Resuelto ✅
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
