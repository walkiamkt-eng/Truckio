import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Activity, ShieldCheck, AlertTriangle, AlertOctagon, Info } from 'lucide-react';
import type { Vehicle, VehicleMaintenanceHealth, Issue } from '../../types/truckio.ts';

interface FleetHealthBarChartProps {
  vehicles: Vehicle[];
  healthMap: Record<string, VehicleMaintenanceHealth>;
  issues: Issue[];
}

export const FleetHealthBarChart: React.FC<FleetHealthBarChartProps> = ({
  vehicles,
  healthMap,
  issues,
}) => {
  const [filterType, setFilterType] = useState<'all' | 'truck' | 'trailer'>('all');

  const filteredVehicles = vehicles.filter((v) => {
    if (filterType === 'all') return true;
    return v.type === filterType;
  });

  // Transform data for Recharts
  const chartData = filteredVehicles.map((vehicle) => {
    const health = healthMap[vehicle.id];
    const vehicleIssues = issues.filter(
      (i) => i.vehicle_id === vehicle.id && i.status !== 'resolved'
    );
    const hasStopped = vehicleIssues.some((i) => i.mobility === 'stopped');

    let category = 'Operativo';
    let color = '#10b981'; // Green (emerald-500)

    if (health?.status === 'red') {
      category = 'Crítico / Vencido';
      color = '#ef4444'; // Red (red-500)
    } else if (health?.status === 'yellow') {
      category = 'Alerta Mantenimiento';
      color = '#f59e0b'; // Amber (amber-500)
    }

    const marginPct = health ? health.minRemainingPercentage : 100;

    return {
      id: vehicle.id,
      plate: vehicle.license_plate,
      fullName: `${vehicle.brand} ${vehicle.model}`,
      type: vehicle.type === 'truck' ? 'Tractor' : 'Remolque',
      mileage: vehicle.current_mileage,
      engineHours: vehicle.current_engine_hours,
      marginPct,
      status: health?.status || 'green',
      category,
      color,
      hasStopped,
      activeIssuesCount: vehicleIssues.length,
      reason: health?.reason || 'Mantenimiento en regla',
    };
  });

  // Calculate comparative counts
  const totalInView = chartData.length;
  const operativoCount = chartData.filter((d) => d.status === 'green').length;
  const mantenimientoCount = chartData.filter((d) => d.status === 'yellow').length;
  const criticoCount = chartData.filter((d) => d.status === 'red').length;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs space-y-1.5 z-50 min-w-[220px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="font-mono font-bold text-amber-400 text-sm">{data.plate}</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {data.type}
            </span>
          </div>

          <div className="font-semibold text-white">{data.fullName}</div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-400">Estado de Salud:</span>
            <span
              className="font-bold px-2 py-0.5 rounded text-[11px]"
              style={{
                color: data.color,
                backgroundColor: `${data.color}20`,
              }}
            >
              {data.category}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Margen Restante:</span>
            <span className="font-mono font-black text-white text-xs">{data.marginPct}%</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Odómetro Actual:</span>
            <span className="font-mono text-slate-200">{data.mileage.toLocaleString('es-AR')} km</span>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800 pt-1.5 italic">
            {data.reason}
          </div>

          {data.activeIssuesCount > 0 && (
            <div className="text-[10px] text-red-400 font-bold flex items-center gap-1 pt-1">
              <AlertTriangle className="w-3 h-3" />
              <span>
                {data.activeIssuesCount} incidencia(s) activa(s){' '}
                {data.hasStopped ? '(¡UNIDAD PARADA!)' : ''}
              </span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 text-slate-100 shadow-xl space-y-4">
      {/* Top Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Activity className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Comparativo de Salud de Flota (Recharts)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 hidden sm:inline-block">
                Margen % vs Umbral Crítico
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Evaluación comparativa del margen operativo según plan preventivo y estado de marcha
            </p>
          </div>
        </div>

        {/* Filter Controls (Todos / Camiones / Remolques) */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                filterType === 'all'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos ({vehicles.length})
            </button>
            <button
              onClick={() => setFilterType('truck')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                filterType === 'truck'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Tractores ({vehicles.filter((v) => v.type === 'truck').length})
            </button>
            <button
              onClick={() => setFilterType('trailer')}
              className={`px-3 py-1 rounded-lg font-bold transition ${
                filterType === 'trailer'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Remolques ({vehicles.filter((v) => v.type === 'trailer').length})
            </button>
          </div>
        </div>
      </div>

      {/* Comparative Legend Badges */}
      <div className="grid grid-cols-3 gap-2.5 bg-slate-950/70 p-3 rounded-2xl border border-slate-800/80 text-xs">
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="font-semibold text-emerald-400">Operativo (&gt;15%)</span>
          </div>
          <span className="font-mono font-black text-white">{operativoCount}</span>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="font-semibold text-amber-400">Mantenimiento (≤15%)</span>
          </div>
          <span className="font-mono font-black text-white">{mantenimientoCount}</span>
        </div>

        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-semibold text-red-400">Crítico / Parado</span>
          </div>
          <span className="font-mono font-black text-white">{criticoCount}</span>
        </div>
      </div>

      {/* Recharts Bar Chart Container */}
      <div className="w-full h-72 sm:h-80 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 15, left: -10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
            <XAxis
              dataKey="plate"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
              dy={8}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Threshold Reference Line: 15% Maintenance Warning */}
            <ReferenceLine
              y={15}
              stroke="#f59e0b"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: 'Umbral 15% (Aviso)',
                fill: '#f59e0b',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />

            {/* Bars with dynamic fill colors based on health status */}
            <Bar dataKey="marginPct" radius={[6, 6, 0, 0]} maxBarSize={45}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={entry.hasStopped ? 0.95 : 0.85}
                  stroke={entry.hasStopped ? '#ffffff' : 'none'}
                  strokeWidth={entry.hasStopped ? 1.5 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insight Note */}
      <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
        <span>
          Las barras muestran el porcentaje de margen disponible antes de requerir intervención preventiva.
          Las unidades con barra roja (<span className="text-red-400 font-bold">Crítico</span>) tienen servicios vencidos o están varadas en ruta; las amarillas (<span className="text-amber-400 font-bold">Mantenimiento</span>) entraron en el umbral del 15%.
        </span>
      </div>
    </div>
  );
};
