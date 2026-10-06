import * as XLSX from 'xlsx';
import type { Vehicle, MaintenancePlan, Issue, VehicleMaintenanceHealth } from '../types/truckio.ts';

export function exportFleetExcelReport(
  vehicles: Vehicle[],
  plans: MaintenancePlan[],
  issues: Issue[],
  healthMap: Record<string, VehicleMaintenanceHealth>
) {
  const wb = XLSX.utils.book_new();

  // 1. Resumen de Flota
  const fleetData = vehicles.map((v) => {
    const health = healthMap[v.id];
    return {
      'ID Unidad': v.id,
      'Tipo': v.type === 'truck' ? 'Tractor / Camión' : 'Remolque / Semirremolque',
      'Patente': v.license_plate,
      'Marca': v.brand,
      'Modelo': v.model,
      'Año': v.year || '-',
      'VIN / Chasis': v.vin || '-',
      'Odómetro Actual (km)': v.current_mileage,
      'Horas Motor': v.current_engine_hours,
      'Estado Operativo': v.is_active ? 'Activo' : 'Inactivo',
      'Semáforo Mantenimiento': health?.status === 'green' ? '🟢 Verde (>15%)' : health?.status === 'yellow' ? '🟡 Amarillo (≤15%)' : '🔴 Rojo (Vencido/Parado)',
      'Detalle Estado': health?.reason || 'OK',
    };
  });
  const wsFleet = XLSX.utils.json_to_sheet(fleetData);
  XLSX.utils.book_append_sheet(wb, wsFleet, 'Resumen_Flota');

  // 2. Planes de Mantenimiento Preventivo
  const planData = plans.map((p) => {
    const v = vehicles.find((veh) => veh.id === p.vehicle_id);
    let currentVal = 0;
    if (v) {
      currentVal = p.trigger_type === 'mileage' ? v.current_mileage : v.current_engine_hours;
    }
    const nextDue = p.last_service_value + p.target_value;
    const remaining = nextDue - currentVal;

    return {
      'ID Plan': p.id,
      'Patente Unidad': v?.license_plate || p.vehicle_id,
      'Vehículo': v ? `${v.brand} ${v.model}` : 'Desconocido',
      'Tarea / Título': p.title,
      'Tipo Disparador': p.trigger_type === 'mileage' ? 'Kilometraje (km)' : p.trigger_type === 'engine_hours' ? 'Horas Motor (hs)' : 'Intervalo Días',
      'Frecuencia Meta': p.target_value,
      'Último Servicio Realizado': p.last_service_value,
      'Fecha Último Servicio': p.last_service_date || '-',
      'Próximo Vencimiento': nextDue,
      'Margen Restante': remaining,
      'Estado': remaining <= 0 ? '¡VENCIDO!' : remaining <= p.target_value * 0.15 ? 'ALERTA PREVENTIVA' : 'EN REGLA',
    };
  });
  const wsPlans = XLSX.utils.json_to_sheet(planData);
  XLSX.utils.book_append_sheet(wb, wsPlans, 'Planes_Mantenimiento');

  // 3. Historial de Incidencias
  const issueData = issues.map((iss) => {
    const v = vehicles.find((veh) => veh.id === iss.vehicle_id);
    return {
      'ID Incidencia': iss.id,
      'Fecha Reporte': new Date(iss.created_at).toLocaleDateString('es-AR') + ' ' + new Date(iss.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      'Patente': v?.license_plate || iss.vehicle_id,
      'Vehículo': v ? `${v.brand} ${v.model}` : '-',
      'Título': iss.title,
      'Descripción': iss.description,
      'Severidad': iss.severity.toUpperCase(),
      'Movilidad': iss.mobility === 'stopped' ? '🔴 Unidad Parada' : '🟢 Sigue en Marcha',
      'Estado Ciclo': iss.status === 'reported' ? 'Reportado' : iss.status === 'under_review' ? 'En Revisión' : iss.status === 'in_workshop' ? 'En Taller' : 'Resuelto',
      'Ubicación': iss.city && iss.state ? `${iss.city}, ${iss.state}` : iss.city || iss.state || 'En ruta',
      'Taller Asignado': iss.assigned_workshop || 'Pendiente de asignación',
      'Costo Reparación (ARS)': iss.repair_cost || 0,
      'Fecha Resolución': iss.resolved_at ? new Date(iss.resolved_at).toLocaleDateString('es-AR') : 'Abierta',
    };
  });
  const wsIssues = XLSX.utils.json_to_sheet(issueData);
  XLSX.utils.book_append_sheet(wb, wsIssues, 'Incidencias_Detalle');

  // 4. Costos y Reparaciones por Taller
  const workshopMap: Record<string, { totalCost: number; issueCount: number; resolvedCount: number }> = {};
  issues.forEach((iss) => {
    const wsName = iss.assigned_workshop || 'Sin Taller Asignado';
    if (!workshopMap[wsName]) {
      workshopMap[wsName] = { totalCost: 0, issueCount: 0, resolvedCount: 0 };
    }
    workshopMap[wsName].issueCount++;
    if (iss.repair_cost) workshopMap[wsName].totalCost += iss.repair_cost;
    if (iss.status === 'resolved') workshopMap[wsName].resolvedCount++;
  });

  const workshopData = Object.entries(workshopMap).map(([name, data]) => ({
    'Taller / Prestador': name,
    'Cantidad de Intervenciones': data.issueCount,
    'Incidencias Resueltas': data.resolvedCount,
    'Gasto Total Acumulado (ARS)': data.totalCost,
    'Costo Promedio x Reparación (ARS)': data.issueCount > 0 ? Math.round(data.totalCost / data.issueCount) : 0,
  }));
  const wsWorkshops = XLSX.utils.json_to_sheet(workshopData);
  XLSX.utils.book_append_sheet(wb, wsWorkshops, 'Costos_Por_Taller');

  // Generate binary and trigger download
  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Truckio_Reporte_Flota_${dateStr}.xlsx`);
}

export function printVehicleDossier() {
  window.print();
}
