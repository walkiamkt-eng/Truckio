import React, { useState } from 'react';
import {
  AlertTriangle,
  Camera,
  MapPin,
  CheckCircle2,
  Trash2,
  Upload,
  Truck,
  Car,
  ChevronRight,
  Loader2,
  X,
} from 'lucide-react';
import { compressImage } from '../../utils/imageCompressor.ts';
import { StorageService, isEffectivelyOffline } from '../../services/storageService.ts';
import type { Vehicle, User, IssueSeverity, MobilityStatus, IssueAttachment } from '../../types/truckio.ts';
import confetti from 'canvas-confetti';

interface IncidentFormProps {
  vehicles: Vehicle[];
  currentUser: User;
  onSuccess: () => void;
  onCancel?: () => void;
  preselectedVehicleId?: string;
}

export const IncidentForm: React.FC<IncidentFormProps> = ({
  vehicles,
  currentUser,
  onSuccess,
  onCancel,
  preselectedVehicleId,
}) => {
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<'truck' | 'trailer'>('truck');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    preselectedVehicleId || vehicles.find((v) => v.type === 'truck')?.id || vehicles[0]?.id || ''
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<IssueSeverity>('medium');
  const [mobility, setMobility] = useState<MobilityStatus>('running');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [locating, setLocating] = useState(false);
  const [attachments, setAttachments] = useState<{ url: string; name: string; compressedSize: number }[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter vehicles by tractor vs remolque
  const filteredVehicles = vehicles.filter((v) => v.type === vehicleTypeFilter);

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert('La geolocalización no está disponible en este dispositivo.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        // Set coordinates in fields and default city/state approximation or GPS string
        const coordsStr = `GPS Lat: ${pos.coords.latitude.toFixed(4)}, Long: ${pos.coords.longitude.toFixed(4)}`;
        if (!city) setCity(coordsStr);
        if (!state) setState('En ruta');
      },
      (err) => {
        setLocating(false);
        alert('No se pudo obtener la posición GPS. Puedes escribir la ciudad o hito manualmente.');
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (attachments.length + files.length > 5) {
      alert('Se permite un máximo de 5 fotografías por incidencia.');
      return;
    }

    setCompressing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressed = await compressImage(file, 1024, 0.8);
        setAttachments((prev) => [
          ...prev,
          {
            url: compressed.dataUrl,
            name: compressed.name,
            compressedSize: compressed.compressedSize,
          },
        ]);
      }
    } catch (err: any) {
      alert('Error al comprimir foto: ' + (err.message || 'Error desconocido'));
    } finally {
      setCompressing(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleId) {
      setErrorMsg('Debes seleccionar un camión o remolque.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Por favor ingresa un título o resumen del problema.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Por favor ingresa una descripción detallada de la falla observada.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const issueAttachments: IssueAttachment[] = attachments.map((att) => ({
        id: 'att-' + Math.random().toString(36).substring(2, 9),
        issue_id: '',
        file_url: att.url,
        file_name: att.name,
        created_at: new Date().toISOString(),
      }));

      const result = await StorageService.createIssue({
        tenant_id: currentUser.tenant_id,
        vehicle_id: selectedVehicleId,
        reported_by_user_id: currentUser.id,
        title: title.trim(),
        description: description.trim(),
        severity,
        mobility,
        status: 'reported',
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        attachments: issueAttachments,
      });

      confetti({
        particleCount: 40,
        spread: 50,
        origin: { y: 0.6 },
      });

      onSuccess();
    } catch (err: any) {
      setErrorMsg('Error al guardar incidencia: ' + (err.message || 'Error desconocido'));
    } finally {
      setSubmitting(false);
    }
  };

  const currentVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-xl max-w-2xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Registrar Incidencia No Programada</h2>
            <p className="text-xs text-slate-400">Reporte inmediato de fallas o averías en ruta</p>
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

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Selector de Tipo: Tractor vs Remolque */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            1. ¿En qué unidad ocurrió la falla?
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setVehicleTypeFilter('truck');
                const firstTruck = vehicles.find((v) => v.type === 'truck');
                if (firstTruck) setSelectedVehicleId(firstTruck.id);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                vehicleTypeFilter === 'truck'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>TRACTOR / CAMIÓN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setVehicleTypeFilter('trailer');
                const firstTrailer = vehicles.find((v) => v.type === 'trailer');
                if (firstTrailer) setSelectedVehicleId(firstTrailer.id);
              }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-bold text-xs transition border ${
                vehicleTypeFilter === 'trailer'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>REMOLQUE / ACOPLADO</span>
            </button>
          </div>

          {/* Vehicle Dropdown / Selector */}
          <select
            value={selectedVehicleId}
            onChange={(e) => setSelectedVehicleId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            {filteredVehicles.map((v) => (
              <option key={v.id} value={v.id}>
                [{v.license_plate}] {v.brand} {v.model} ({v.current_mileage.toLocaleString()} km)
              </option>
            ))}
          </select>
        </div>

        {/* 2. Estado de Movilidad de la Unidad (CRÍTICO: Unidad Parada vs En Marcha) */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            2. ¿La unidad puede continuar la marcha?
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMobility('stopped')}
              className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition ${
                mobility === 'stopped'
                  ? 'bg-red-500/20 border-red-500 text-red-200 ring-2 ring-red-500/30'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-red-500 mb-1.5 animate-pulse" />
              <span className="font-black text-sm text-white">🔴 UNIDAD PARADA</span>
              <span className="text-[11px] text-slate-300 mt-0.5">
                Riesgo de seguridad / Varado en ruta
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobility('running')}
              className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center text-center transition ${
                mobility === 'running'
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/30'
                  : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-emerald-500 mb-1.5" />
              <span className="font-black text-sm text-white">🟢 SIGUE EN MARCHA</span>
              <span className="text-[11px] text-slate-300 mt-0.5">
                Avería menor / Puede llegar a destino
              </span>
            </button>
          </div>
        </div>

        {/* 3. Nivel de Severidad */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            3. Nivel de Severidad
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(
              [
                { id: 'low', label: 'Leve', color: 'border-slate-600 bg-slate-800 text-slate-300' },
                { id: 'medium', label: 'Media', color: 'border-blue-500 bg-blue-950/40 text-blue-300' },
                { id: 'high', label: 'Alta', color: 'border-amber-500 bg-amber-950/40 text-amber-300' },
                { id: 'critical', label: 'Crítica', color: 'border-red-500 bg-red-950/40 text-red-300' },
              ] as const
            ).map((sev) => {
              const active = severity === sev.id;
              return (
                <button
                  key={sev.id}
                  type="button"
                  onClick={() => setSeverity(sev.id)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition ${
                    active
                      ? `${sev.color} ring-2 ring-amber-400/50 font-black`
                      : 'border-slate-800 bg-slate-900 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {sev.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Título & Descripción */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              4. Resumen del Problema *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Falla de frenos en eje trasero, manguera rota"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Descripción Detallada *
            </label>
            <textarea
              required
              rows={3}
              placeholder="Explica qué ruido se escuchó, luces en el tablero, síntomas o cómo ocurrió el problema..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>
        </div>

        {/* 5. Ubicación en Ruta */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              5. Ubicación en Ruta
            </label>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={locating}
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              <MapPin className={`w-3.5 h-3.5 ${locating ? 'animate-bounce' : ''}`} />
              <span>{locating ? 'Detectando GPS...' : 'Obtener GPS actual'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Ciudad o Hito (ej: Zárate, Km 92)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="Provincia (ej: Buenos Aires)"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* 6. Evidencia Fotográfica (Compresión local Canvas < 1MB) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                6. Evidencias Fotográficas ({attachments.length}/5)
              </label>
              <p className="text-[11px] text-slate-400">
                Compresión automática en tu teléfono a WebP (&lt;1 MB) para operar sin señal
              </p>
            </div>

            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-sm active:scale-95">
              <Camera className="w-4 h-4" />
              <span>Tomar / Subir Foto</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                disabled={compressing || attachments.length >= 5}
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          {compressing && (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Comprimiendo imagen en el navegador...</span>
            </div>
          )}

          {/* Photo Gallery preview */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
              {attachments.map((att, idx) => (
                <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-square">
                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded bg-black/75 text-[9px] text-slate-300 font-mono">
                    {Math.round(att.compressedSize / 1024)} KB
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
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
            disabled={submitting || compressing}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Enviar Incidencia</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
