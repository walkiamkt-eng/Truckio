import React, { useState, useEffect } from 'react';
import { Plus, UserCheck, Truck, ShieldAlert } from 'lucide-react';
import { StorageService } from '../../services/storageService';
import type { Vehicle, User } from '../../types/truckio';
import { VehicleModal } from './VehicleModal';
import { AssignVehicleModal } from './AssignVehicleModal'; // <--- El nuevo modal que creamos

interface FleetPageProps {
  tenantId: string;
  currentUser: User; // Para validar roles si es necesario
}

export const FleetPage: React.FC<FleetPageProps> = ({ tenantId, currentUser }) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Estados para controlar los modales
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState<boolean>(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);

  useEffect(() => {
    loadFleet();
  }, [tenantId]);

  const loadFleet = async () => {
    try {
      setLoading(true);
      const data = await StorageService.getVehicles(tenantId);
      setVehicles(data);
    } catch (err) {
      console.error('Error al cargar flota:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdminOrManager = currentUser.role === 'admin' || currentUser.role === 'fleet_manager';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Cabecera de la Página y Botones de Acción */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <Truck className="w-7 h-7 text-amber-500" />
            Gestión de Flota y Unidades
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Administración de tractores, remolques y asignaciones operativas en tiempo real.
          </p>
        </div>

        {/* Botones exclusivos para Administradores o Gerentes */}
        {isAdminOrManager && (
          <div className="flex items-center gap-3">
            {/* Botón para Asignar Unidad (Abre AssignVehicleModal) */}
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg text-xs"
            >
              <UserCheck className="w-4 h-4" />
              <span>Asignar Unidad a Chofer</span>
            </button>

            {/* Botón para Registrar Nuevo Vehículo (Abre VehicleModal limpio) */}
            <button
              onClick={() => {
                setVehicleToEdit(null);
                setIsVehicleModalOpen(true);
              }}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg text-xs"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Registrar Unidad</span>
            </button>
          </div>
        )}
      </div>

      {/* Listado de Vehículos */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">Cargando flota de la empresa...</div>
      ) : vehicles.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/50 border border-slate-800 rounded-3xl p-8">
          <p className="text-slate-400 text-sm mb-2">No hay unidades registradas en este tenant.</p>
          <p className="text-slate-500 text-xs">Utiliza el botón de registrar para dar de alta el primer tractor o remolque libre de asignaciones.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <div 
              key={vehicle.id} 
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 font-mono font-bold text-xs border border-slate-700">
                  {vehicle.license_plate}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  vehicle.is_active ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                }`}>
                  {vehicle.is_active ? 'Operativa' : 'Inactiva'}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white uppercase">{vehicle.brand} {vehicle.model}</h3>
                <p className="text-xs text-slate-400 uppercase">Tipo: {vehicle.type === 'truck' ? 'Tractor / Camión' : 'Remolque'}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Kilometraje: <strong className="text-slate-200 font-mono">{vehicle.current_km ?? 0} km</strong></span>
                <button
                  onClick={() => {
                    setVehicleToEdit(vehicle);
                    setIsVehicleModalOpen(true);
                  }}
                  className="text-amber-400 hover:underline font-semibold"
                >
                  Editar Ficha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- MODALES --- */}
      
      {/* Modal de Creación / Edición de Vehículo */}
      {isVehicleModalOpen && (
        <VehicleModal
          vehicleToEdit={vehicleToEdit}
          tenantId={tenantId}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setVehicleToEdit(null);
          }}
          onSuccess={() => {
            setIsVehicleModalOpen(false);
            setVehicleToEdit(null);
            loadFleet();
          }}
        />
      )}

      {/* Modal de Asignación Manual a Chofer */}
      {isAssignModalOpen && (
        <AssignVehicleModal
          tenantId={tenantId}
          onClose={() => setIsAssignModalOpen(false)}
          onSuccess={() => {
            setIsAssignModalOpen(false);
            loadFleet();
          }}
        />
      )}
    </div>
  );
};