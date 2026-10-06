import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Vehicle, MaintenancePlan, Issue, VehicleMaintenanceHealth } from '../types/truckio.ts';

export interface FleetPDFReportOptions {
  includeResolvedIssues?: boolean;
  notes?: string;
}

export function generateFleetMaintenancePDF(
  vehicles: Vehicle[],
  plans: MaintenancePlan[],
  issues: Issue[],
  healthMap: Record<string, VehicleMaintenanceHealth>,
  options: FleetPDFReportOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString('es-AR');
  const timeStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  // Semaphoric counts
  const greenCount = vehicles.filter((v) => healthMap[v.id]?.status === 'green').length;
  const yellowCount = vehicles.filter((v) => healthMap[v.id]?.status === 'yellow').length;
  const redCount = vehicles.filter((v) => healthMap[v.id]?.status === 'red').length;

  // Filter pending issues (not resolved)
  const pendingIssues = issues.filter((i) => i.status !== 'resolved');
  const stoppedUnitsCount = pendingIssues.filter((i) => i.mobility === 'stopped').length;
  const totalCost = issues.reduce((acc, curr) => acc + (curr.repair_cost || 0), 0);

  // Brand Palette:
  // Primary Dark: [15, 23, 42] (Slate-900)
  // Amber Accent: [234, 88, 12] / [245, 158, 11]
  // Green: [16, 185, 129]
  // Yellow: [217, 119, 6]
  // Red: [220, 38, 38]

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(0, 0, 210, 34, 'F');

  // Title & Brand
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TRUCKIO', 14, 14);

  doc.setFontSize(10);
  doc.setTextColor(245, 158, 11); // Amber
  doc.text('FLEET OS • GESTIÓN INTEGRADA DE MANTENIMIENTO', 47, 14);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text('Transportes Aconcagua S.A. • Informe Técnico de Flota', 14, 22);
  doc.text(`Fecha de Emisión: ${dateStr} - ${timeStr} hs`, 14, 28);

  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text('CONFIDENCIAL / USO OPERATIVO', 210 - 14, 28, { align: 'right' });

  // --- EXECUTIVE SUMMARY CARDS ---
  let currentY = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Resumen Ejecutivo de Estado de la Flota', 14, currentY);

  currentY += 4;

  // KPI boxes (4 boxes)
  const boxWidth = 43;
  const boxHeight = 16;
  const gap = 3;
  const startX = 14;

  // Box 1: Total Unidades
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(startX, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL UNIDADES', startX + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`${vehicles.length} Vehículos`, startX + 3, currentY + 12);

  // Box 2: Verde
  const x2 = startX + boxWidth + gap;
  doc.setFillColor(236, 253, 245); // emerald-50
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(x2, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text('EN REGLA (>15%)', x2 + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(5, 150, 105);
  doc.text(`${greenCount} unidades`, x2 + 3, currentY + 12);

  // Box 3: Amarillo
  const x3 = x2 + boxWidth + gap;
  doc.setFillColor(254, 252, 232); // yellow-50
  doc.setDrawColor(254, 240, 138);
  doc.roundedRect(x3, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(180, 83, 9);
  doc.text('ALERTA PREV. (<=15%)', x3 + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(217, 119, 6);
  doc.text(`${yellowCount} unidades`, x3 + 3, currentY + 12);

  // Box 4: Rojo
  const x4 = x3 + boxWidth + gap;
  doc.setFillColor(254, 242, 242); // red-50
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(x4, currentY, boxWidth, boxHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  doc.text('CRÍTICOS / VENCIDOS', x4 + 3, currentY + 5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(220, 38, 38);
  doc.text(`${redCount} (${stoppedUnitsCount} paradas)`, x4 + 3, currentY + 12);

  currentY += boxHeight + 8;

  // --- TABLA 1: ESTADO SEMAFÓRICO DE MANTENIMIENTO ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Diagnóstico de Mantenimiento por Unidad de Flota', 14, currentY);
  currentY += 2;

  const fleetRows = vehicles.map((v) => {
    const health = healthMap[v.id];
    let semaforoText = 'Verde (OK)';
    if (health?.status === 'red') semaforoText = 'ROJO (Vencido/Parado)';
    else if (health?.status === 'yellow') semaforoText = 'AMARILLO (Alerta)';

    return [
      v.license_plate,
      v.type === 'truck' ? 'Tractor' : 'Remolque',
      `${v.brand} ${v.model}`,
      `${v.current_mileage.toLocaleString('es-AR')} km`,
      `${v.current_engine_hours.toLocaleString('es-AR')} hs`,
      `${health?.minRemainingPercentage ?? 100}%`,
      semaforoText,
      health?.reason || 'Al día',
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [
      ['Patente', 'Tipo', 'Marca y Modelo', 'Km Actual', 'Horas', 'Margen %', 'Semáforo', 'Diagnóstico / Causa'],
    ],
    body: fleetRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 19 }, // Patente
      1: { cellWidth: 17 }, // Tipo
      2: { cellWidth: 36 }, // Modelo
      3: { halign: 'right', cellWidth: 20 }, // Km
      4: { halign: 'right', cellWidth: 15 }, // Horas
      5: { halign: 'center', cellWidth: 16 }, // Margen
      6: { cellWidth: 26, fontStyle: 'bold' }, // Semáforo
      7: { cellWidth: 'auto' }, // Diagnóstico
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        const val = String(data.cell.raw);
        if (val.includes('ROJO')) {
          data.cell.styles.textColor = [185, 28, 28]; // Red
          data.cell.styles.fillColor = [254, 242, 242];
        } else if (val.includes('AMARILLO')) {
          data.cell.styles.textColor = [180, 83, 9]; // Amber
          data.cell.styles.fillColor = [254, 252, 232];
        } else {
          data.cell.styles.textColor = [4, 120, 87]; // Green
          data.cell.styles.fillColor = [236, 253, 245];
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- TABLA 2: INCIDENCIAS PENDIENTES Y ABIERTAS ---
  // Check if we need page break
  if (currentY > 230) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. Incidencias Operativas Pendientes de Resolución (${pendingIssues.length})`, 14, currentY);
  currentY += 2;

  const displayIssues = options.includeResolvedIssues ? issues : pendingIssues;

  if (displayIssues.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No se registran incidencias pendientes en la flota. Todas las unidades operan con normalidad.', 14, currentY + 5);
    currentY += 14;
  } else {
    const issueRows = displayIssues.map((iss) => {
      const v = vehicles.find((veh) => veh.id === iss.vehicle_id);
      const mobilityStr = iss.mobility === 'stopped' ? 'UNIDAD PARADA' : 'En marcha';
      const statusMap: Record<string, string> = {
        reported: 'Reportado',
        under_review: 'En Revisión',
        in_workshop: 'En Taller',
        resolved: 'Resuelto',
      };

      return [
        new Date(iss.created_at).toLocaleDateString('es-AR'),
        v?.license_plate || 'N/D',
        iss.title,
        iss.severity.toUpperCase(),
        mobilityStr,
        statusMap[iss.status] || iss.status,
        iss.city || 'En ruta',
        iss.assigned_workshop || 'A definir',
        iss.repair_cost ? `$${iss.repair_cost.toLocaleString('es-AR')}` : '-',
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        ['Fecha', 'Patente', 'Incidencia / Problema', 'Severidad', 'Movilidad', 'Estado', 'Ubicación', 'Taller', 'Costo Est.'],
      ],
      body: issueRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        overflow: 'linebreak',
      },
      headStyles: {
        fillColor: [185, 28, 28], // Red header for issues
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 17 }, // Fecha
        1: { fontStyle: 'bold', cellWidth: 18 }, // Patente
        2: { cellWidth: 42 }, // Título
        3: { cellWidth: 16 }, // Severidad
        4: { cellWidth: 23, fontStyle: 'bold' }, // Movilidad
        5: { cellWidth: 19 }, // Estado
        6: { cellWidth: 18 }, // Ubicación
        7: { cellWidth: 20 }, // Taller
        8: { halign: 'right', cellWidth: 15 }, // Costo
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const val = String(data.cell.raw);
          if (val === 'UNIDAD PARADA') {
            data.cell.styles.textColor = [220, 38, 38];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [254, 226, 226];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // --- TABLA 3: PLANES PREVENTIVOS VENCIDOS O EN ALERTA ---
  const criticalPlans = plans.filter((p) => {
    const v = vehicles.find((veh) => veh.id === p.vehicle_id);
    let currentVal = 0;
    if (v) {
      currentVal = p.trigger_type === 'mileage' ? v.current_mileage : v.current_engine_hours;
    }
    const nextDue = p.last_service_value + p.target_value;
    const remaining = nextDue - currentVal;
    return remaining <= p.target_value * 0.15; // Vencido o warning
  });

  if (criticalPlans.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. Servicios Preventivos en Umbral Crítico o Vencidos (${criticalPlans.length})`, 14, currentY);
    currentY += 2;

    const planRows = criticalPlans.map((p) => {
      const v = vehicles.find((veh) => veh.id === p.vehicle_id);
      let currentVal = 0;
      if (v) {
        currentVal = p.trigger_type === 'mileage' ? v.current_mileage : v.current_engine_hours;
      }
      const nextDue = p.last_service_value + p.target_value;
      const remaining = nextDue - currentVal;
      const isOverdue = remaining <= 0;

      return [
        v?.license_plate || 'N/D',
        p.title,
        p.trigger_type === 'mileage' ? 'Kilometraje' : p.trigger_type === 'engine_hours' ? 'Horas Motor' : 'Días',
        `${p.target_value.toLocaleString('es-AR')} ${p.trigger_type === 'mileage' ? 'km' : 'hs'}`,
        `${nextDue.toLocaleString('es-AR')} ${p.trigger_type === 'mileage' ? 'km' : 'hs'}`,
        isOverdue ? `¡VENCIDO (${Math.abs(remaining).toLocaleString('es-AR')} excedidos)!` : `Resta ${remaining.toLocaleString('es-AR')}`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        ['Patente', 'Plan Preventivo', 'Tipo', 'Frecuencia', 'Vence A', 'Estado de Cumplimiento'],
      ],
      body: planRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
      },
      headStyles: {
        fillColor: [217, 119, 6], // Amber header
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 20 },
        1: { cellWidth: 60 },
        2: { cellWidth: 22 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 'auto', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const val = String(data.cell.raw);
          if (val.includes('VENCIDO')) {
            data.cell.styles.textColor = [185, 28, 28];
            data.cell.styles.fillColor = [254, 242, 242];
          }
        }
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 12;
  }

  // --- SIGNATURE BLOCKS ---
  if (currentY > 240) {
    doc.addPage();
    currentY = 25;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(14, currentY, 210 - 14, currentY);
  currentY += 8;

  // Signatures
  const col1X = 20;
  const col2X = 120;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  doc.line(col1X, currentY + 14, col1X + 65, currentY + 14);
  doc.text('Ing. Mariana Rossi', col1X, currentY + 18);
  doc.text('Gestora de Mantenimiento & Flota', col1X, currentY + 22);

  doc.line(col2X, currentY + 14, col2X + 65, currentY + 14);
  doc.text('Dirección Técnica de Operaciones', col2X, currentY + 18);
  doc.text('Transportes Aconcagua S.A.', col2X, currentY + 22);

  // --- FOOTER & PAGE NUMBERS ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Truckio Fleet OS • Sistema de Gestión de Mantenimiento • Página ${i} de ${totalPages}`,
      105,
      290,
      { align: 'center' }
    );
    doc.text(
      `Emitido: ${dateStr}`,
      14,
      290
    );
  }

  return doc;
}

export function downloadFleetMaintenancePDF(
  vehicles: Vehicle[],
  plans: MaintenancePlan[],
  issues: Issue[],
  healthMap: Record<string, VehicleMaintenanceHealth>,
  options: FleetPDFReportOptions = {}
) {
  const doc = generateFleetMaintenancePDF(vehicles, plans, issues, healthMap, options);
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`Truckio_Resumen_Mantenimiento_Flota_${dateStr}.pdf`);
}
