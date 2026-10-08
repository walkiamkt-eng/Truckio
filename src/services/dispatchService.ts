import React, { useState, useEffect } from 'react';
import { Navigation, Plus, RefreshCw, AlertCircle, CheckCircle2, Truck, User, MapPin, Calendar, Clock, Check, X } from 'lucide-react';
import { DispatchService } from '../services/dispatchService';
import { UserService } from '../services/userService';
import type { User as UserType, Vehicle, Trailer, Assignment, AssignmentStatus } from '../types/truckio';

interface DispatchViewProps {
  currentUser: UserType;
}

export const DispatchView: React.FC<DispatchViewProps> = ({ currentUser }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availableDrivers, setAvailableDrivers] = useState<UserType[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
  const [availableTrailers, setAvailableTrailers] = useState<Trailer[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de Nuevo Viaje
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formulario de asignación
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [trailerId, setTrailerId] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar Viajes/Asignaciones
      const assignmentsData = await DispatchService.getAssignments(currentUser.tenant_id);
      setAssignments(assignmentsData);

      // 2. Cargar Choferes
      const usersData = await UserService.getTenantUsers(currentUser.tenant_id);
      setAvailableDrivers(usersData.filter((u) => u.role === 'driver'));

      // 3. Cargar Vehículos y Remolques
      const vehiclesData = await DispatchService.getVehicles(currentUser.tenant_id);
      setAvailableVehicles(vehiclesData.filter((v) => v.status === 'available' || !v.status));

      const trailersData = await DispatchService.getTrailers(currentUser.tenant_id);
      setAvailableTrailers(trailersData.filter((t) => t.status === 'available' || !t.status));
    } catch (err: any) {
      setError('Error al cargar la información de despacho y viajes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser.tenant_id]);

  // Crear una nueva asignación de viaje
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driverId || !vehicleId) {
      setError('Debes seleccionar al menos un Chofer y un Vehículo principal.');
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await DispatchService.createAssignment({
        tenant_id: currentUser.tenant_id,
        driver_id: driverId,
        vehicle_id: vehicleId,
        trailer_id: trailerId || null,
        origin,
        destination,
        notes,
      });

      setSuccessMsg('Viaje asignado correctamente.');
      setIsModalOpen(false);
      
      // Reset Form
      setDriverId('');
      setVehicleId('');
      setTrailerId('');
      setOrigin('');
      setDestination('');
      setNotes('');

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Error al crear la asignación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Finalizar o Cancelar Viaje
  const handleUpdateStatus = async (
    assignment: Assignment,
    newStatus: 'completed' | 'cancelled'
  ) => {
    const actionText = newStatus === 'completed' ? 'finalizar' : 'cancelar';
    if (!confirm(`¿Estás seguro de que deseas ${actionText} este viaje?`)) return;

    try {
      await DispatchService.updateAssignmentStatus(
        assignment.id,
        assignment.vehicle_id,
        assignment.trailer_id,
        newStatus
      );
      setSuccessMsg(`Viaje ${newStatus === 'completed' ? 'finalizado' : 'cancelado'} y activos liberados.`);
      await loadData();
    } catch (err: any) {
      setError('Error al actualizar el estado del viaje.');
    }
  };

  const getStatusBadge = (status: AssignmentStatus) => {
    switch (status) {
      case 'active':
        return <span className="bg-emerald-500/20 text-emerald-300 text-xs font-semibold px-2.5 py-1 rounded border border-emerald-500/30">En Curso</span>;
      case 'scheduled':
        return <span className="bg-amber-500/20 text-amber-300 text-xs font-semibold px-2.5 py-1 rounded border border-amber-500/30">Programado</span>;
      case 'completed':
        return <span className="bg-blue-500/20 text-blue-300 text-xs font-semibold px-2.5 py-1 rounded border border-blue-500/30">Finalizado</span>;
      case 'cancelled':
        return <span className="bg-red-500/20 text-red-300 text-xs font-semibold px-2.5 py-1 rounded border border-red-500/30">Cancelado</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-1 rounded">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 font-mono">
            <Navigation className="w-7 h-7 text-amber-400" />
            Despacho y Asignación de Viajes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Asigna vehículos, trailers y choferes para gestionar los viajes de tu flota.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            title="Recargar datos"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-xl transition shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            Nuevo Despacho
          </button>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{successMsg}</span>
        </div>
      )}

      {/* Lista de Asignaciones */}
      <div className="bg-slate-900 rounded-2xl shadow-xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-400 mb-2" />
            Cargando viajes y asignaciones...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            No hay asignaciones de viaje registradas en la empresa.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-mono text-xs uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4">Chofer</th>
                  <th className="px-6 py-4">Unidad / Tractor</th>
                  <th className="px-6 py-4">Remolque</th>
                  <th className="px-6 py-4">Ruta (Origen → Destino)</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-6 py-4 font-medium">{getStatusBadge(a.status)}</td>
                    <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      {a.driver_name}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                        {a.vehicle_plate}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {a.trailer_id ? (
                        <span className="font-mono text-slate-300 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                          {a.trailer_plate}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Sin remolque</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{a.origin || 'N/D'}</span>
                        <span className="text-slate-500 font-bold">→</span>
                        <span>{a.destination || 'N/D'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(a.status === 'scheduled' || a.status === 'active') && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(a, 'completed')}
                            className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                            title="Completar Viaje"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Finalizar
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(a, 'cancelled')}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                            title="Cancelar Viaje"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Nueva Asignación de Viaje */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 font-mono">
                <Truck className="w-5 h-5 text-amber-400" />
                Nuevo Despacho de Viaje
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-5 space-y-4">
              {/* Selección de Chofer */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Chofer Asignado *
                </label>
                <select
                  required
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >
                  <option value="">Seleccionar Chofer...</option>
                  {availableDrivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de Tractor */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 font-mono">
                  Vehículo / Tractor Principal *
                </label>
                <select
                  required
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                >