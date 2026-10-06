import { supabase } from '@/lib/supabase';
import React, { useState } from 'react';
import { Truck, Car, CheckCircle2, X } from 'lucide-react';
import { StorageService } from '../../services/storageService.ts';
import type { Vehicle, VehicleType } from '../../types/truckio.ts';

interface VehicleModalProps {
  vehicleToEdit?: Vehicle | null;
  tenantId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  vehicleToEdit,
  tenantId,
  onClose,
  onSuccess,
}) => {
  const isEditing = !!vehicleToEdit;

  const [type, setType] = useState<VehicleType>(vehicleToEdit?.type || 'truck');
  const [licensePlate, setLicensePlate] = useState(vehicleToEdit?.license_plate || '');
  const [brand, setBrand] = useState(vehicleToEdit?.brand || '');
  const [model, setModel] = useState(vehicleToEdit?.model || '');
  const [year, setYear] = useState<number | ''>(vehicleToEdit?.year || 2023);
  const [vin, setVin] = useState(vehicleToEdit?.vin || '');
  const [mileage, setMileage] = useState<number | ''>(vehicleToEdit?.current_mileage || 0);
  const [engineHours, setEngineHours] = useState<number | ''>(vehicleToEdit?.current_engine_hours || 0);
  const [notes, setNotes] = useState(vehicleToEdit?.notes || '');
  const [isActive, setIsActive] = useState<boolean>(vehicleToEdit?.is_active ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) {
      setError('La patente es obligatoria.');
      return;
    }
    if (!brand.trim() || !model.trim()) {
      setError('Marca y modelo son obligatorios.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing && vehicleToEdit) {
        await StorageService.updateVehicle(vehicleToEdit.id, {
          type,
          license_plate: licensePlate.trim().toUpperCase(),
          brand: brand.trim(),
          model: model.trim(),
          year: year === '' ? undefined : Number(year),
          vin: vin.trim() || undefined,
          current_mileage: mileage === '' ? 0 : Number(mileage),
          current_engine_hours: engineHours === '' ? 0 : Number(engineHours),
          notes: notes.trim() || undefined,
          is_active: isActive,
        });
      } else {
        await StorageService.createVehicle({
          tenant_id: tenantId,
          type,
          license_plate: licensePlate.trim().toUpperCase(),
          brand: brand.trim(),
          model: model.trim(),
          year: year === '' ? undefined : Number(year),
          vin: vin.trim() || undefined,
          current_mileage: mileage === '' ? 0 : Number(mileage),
          current_engine_hours: engineHours === '' ? 0 : Number(engineHours),
          notes: notes.trim() || undefined,
          is_active: isActive,
        });
      }

      onSuccess();
    } catch (err: any) {
      setError('Error al guardar vehículo: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 overflow-y-auto flex items-center justify-center animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full my-6 p-6 text-slate-100 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Truck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isEditing ? 'Editar Ficha de Vehículo' : 'Registrar Nueva Unidad'}
              </h3>
              <p className="text-xs text-slate-400">Tractor o remolque en la flota de la empresa</p>
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
          {/* Tipo de Unidad */}
          <div>
            <label className="block text-slate-300 font-bold mb-1.5 uppercase tracking-wider text-[11px]">
              Tipo de Unidad
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('truck')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                  type === 'truck'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Tractor / Camión</span>
              </button>
              <button
                type="button"
                onClick={() => setType('trailer')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${
                  type === 'trailer'
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                <Car className="w-4 h-4" />
                <span>Remolque / Acoplado</span>
              </button>
            </div>
          </div>

          {/* Patente y Año */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Patente / Placa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: AE 482 OK"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Año
              </label>
              <input
                type="number"
                min="1990"
                max="2030"
                placeholder="Ej: 2023"
                value={year}
                onChange={(e) => setYear(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Marca y Modelo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Marca *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Scania, Volvo, Randon"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Modelo *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: R450 6x2, B-Train 52m3"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Odómetro inicial y Horas Motor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Kilometraje Inicial (km)
              </label>
              <input
                type="number"
                min="0"
                value={mileage}
                onChange={(e) => setMileage(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
                Horas Motor (hs)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={engineHours}
                onChange={(e) => setEngineHours(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* VIN & Notas */}
          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
              Chasis / VIN (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: 9BS8482OK6612984"
              value={vin}
              onChange={(e) => setVin(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1 uppercase tracking-wider text-[11px]">
              Observaciones / Asignación
            </label>
            <textarea
              rows={2}
              placeholder="Ruta asignada, tipo de carrocería, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          {/* Activo / Inactivo */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
            />
            <label htmlFor="isActiveCheck" className="text-slate-300 font-semibold cursor-pointer">
              Unidad operativa habilitada para circular
            </label>
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
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold transition shadow-md"
            >
              {saving ? 'Guardando...' : isEditing ? 'Guardar Cambios' : 'Crear Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
