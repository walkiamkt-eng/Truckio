import React, { useState } from 'react';
import type { User, Vehicle } from '../../types/truckio';
import { Navigation, MapPin, Clock, CheckCircle2, AlertTriangle, Plus, X, Truck } from 'lucide-react';

interface DispatchViewProps {
  currentUser: User;
  vehicles?: Vehicle[];
  users?: User[];
}

interface DispatchRoute {
  id: string;
  code: string;
  origin: string;
  destination: string;
  driverName: string;
  vehiclePlate: string;
  trailerPlate?: string;
  status: 'pending' | 'in_transit' | 'completed' | 'delayed';
  departureTime: string;
  estimatedArrival: string;
}

const INITIAL_DISPATCHES: DispatchRoute[] = [
  {
    id: 'disp-1',
    code: 'DSP-2026-001',
    origin: 'Terminal Central (Buenos Aires)',
    destination: 'Depósito Aconcagua (Mendoza)',
    driverName: 'Carlos Gómez',
    vehiclePlate: 'AA 123 CD',
    trailerPlate: 'R-884-XY',
    status: 'in_transit',
    departureTime: '06:30 HS',
    estimatedArrival: '18:45 HS',
  },
  {
    id: 'disp-2',
    code: 'DSP-2026-002',
    origin: 'Centro Distribución (Rosario)',
    destination: 'Puerto Córdoba',
    driverName: 'Matías Silva',
    vehiclePlate: 'AB 456 EF',
    status: 'pending',
    departureTime: '21:00 HS',
    estimatedArrival: '05:30 HS (+1d)',
  },
];

export const DispatchView: React.FC<DispatchViewProps> = ({
  currentUser,
  vehicles = [],
  users = [],
}) => {
  const [dispatches, setDispatches] = useState<DispatchRoute[]>(INITIAL_DISPATCHES);
  const [filter, setFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtrado de listas para los desplegables
  const motorVehicles = vehicles.filter((v) => v.type === 'truck' || !v.type);
  const trailerVehicles = vehicles.filter((v) => v.type === 'trailer');
  const driverUsers = users.filter((u) => u.role === 'driver');

  // Estado del formulario con IDs seleccionados
  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    driverId: '',
    vehicleId: '',
    trailerId: '',
    departureTime: '',
    estimatedArrival: '',
  });

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.origin || !formData.destination || !formData.vehicleId) return;

    const selectedVehicle = vehicles.find((v) => v.id === formData.vehicleId);
    const selectedTrailer = vehicles.find((v) => v.id === formData.trailerId);
    const selectedDriver = users.find((u) => u.id === formData.driverId);

    const newDispatch: DispatchRoute = {
      id: `disp-${Date.now()}`,
      code: `DSP-2026-${String(dispatches.length + 1).padStart(3, '0')}`,
      origin: formData.origin,
      destination: formData.destination,
      driverName: selectedDriver ? (selectedDriver.full_name || selectedDriver.name || 'Chofer') : 'Sin asignar',
      vehiclePlate: selectedVehicle ? selectedVehicle.plate : 'Sin patente',
      trailerPlate: selectedTrailer ? selectedTrailer.plate : undefined,
      status: 'pending',
      departureTime: formData.departureTime || 'Por confirmar',
      estimatedArrival: formData.estimatedArrival || 'Por confirmar',
    };

    setDispatches([newDispatch, ...dispatches]);
    setIsModalOpen(false);
    setFormData({
      origin: '',
      destination: '',
      driverId: '',
      vehicleId: '',
      trailerId: '',
      departureTime: '',
      estimatedArrival: '',
    });
  };

  const filteredDispatches = dispatches.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const getStatusBadge = (status: DispatchRoute['status']) => {
    switch (status) {
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            En Tránsito
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" />
            Programado
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Completado
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3 h-3" />
            Demorado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-mono text-white">Módulo de Despacho y Rutas</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Panel de gestión de rutas y asignación de despachos en tiempo real.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Despacho</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'in_transit', label: 'En Tránsito' },
          { id: 'pending', label: 'Programados' },
          { id: 'completed', label: 'Completados' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === f.id
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grilla de despachos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDispatches.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl space-y-4 transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-400 font-bold">{item.code}</span>
              {getStatusBadge(item.status)}
            </div>

            <div className="space-y-2 border-y border-slate-800 py-3">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Origen</p>
                  <p className="text-xs font-semibold text-slate-200">{item.origin}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Destino</p>
                  <p className="text-xs font-semibold text-slate-200">{item.destination}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60 space-y-1">
                <span className="text-[10px] text-slate-400 block font-bold">Unidad & Chofer</span>
                <div className="flex items-center gap-1 text-slate-200 font-semibold truncate">
                  <Truck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate">{item.vehiclePlate}</span>
                </div>
                {item.trailerPlate && (
                  <div className="flex items-center gap-1 text-slate-300 text-[11px] truncate">
                    <span className="text-amber-500 font-bold text-[10px]">[R]</span>
                    <span className="truncate">{item.trailerPlate}</span>
                  </div>
                )}
                <span className="text-slate-400 text-[11px] truncate block pt-0.5">{item.driverName}</span>
              </div>

              <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block font-bold">Horarios</span>
                <span className="text-slate-300 text-[11px] block mt-0.5">Salida: {item.departureTime}</span>
                <span className="text-slate-300 text-[11px] block">Llegada: {item.estimatedArrival}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Alta de Despacho */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white font-mono flex items-center gap-2">
                <Navigation className="w-5 h-5 text-amber-400" />
                Alta de Nuevo Despacho
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDispatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Origen *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Terminal Central"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Destino *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Planta Mendoza"
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Desplegable Camión / Motor */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Camión / Motor *</label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar Camión...</option>
                    {(motorVehicles.length > 0 ? motorVehicles : vehicles).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} - {v.brand} {v.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desplegable Remolque (Opcional) */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Remolque <span className="text-slate-500 font-normal">(Opcional)</span>
                  </label>
                  <select
                    value={formData.trailerId}
                    onChange={(e) => setFormData({ ...formData, trailerId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Sin remolque</option>
                    {trailerVehicles.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.plate} - {t.brand} {t.model}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Desplegable Chofer */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Chofer Asignado</label>
                  <select
                    value={formData.driverId}
                    onChange={(e) => setFormData({ ...formData, driverId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Seleccionar Chofer...</option>
                    {(driverUsers.length > 0 ? driverUsers : users).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hora Salida</label>
                  <input
                    type="text"
                    placeholder="Ej. 08:00 HS"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Hora Llegada Est.</label>
                  <input
                    type="text"
                    placeholder="Ej. 16:30 HS"
                    value={formData.estimatedArrival}
                    onChange={(e) => setFormData({ ...formData, estimatedArrival: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  Guardar Despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};