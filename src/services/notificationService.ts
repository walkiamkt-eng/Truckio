import type { User, Vehicle, MaintenancePlan, NotificationItem } from '../types/truckio.ts';
import { db } from '../db/indexedDB.ts';

export const TRUCKIO_NOTIFICATIONS_CHANGED = 'truckio_notifications_changed';

const NOTIFICATIONS_STORAGE_KEY = 'truckio_local_notifications_v1';

export class NotificationService {
  /**
   * Request system notification permission if supported
   */
  public static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Este navegador no soporta la API de Notificaciones del sistema.');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (err) {
      console.warn('No se pudo solicitar permisos de notificación (posible restricción en iframe):', err);
      return 'denied';
    }
  }

  public static hasPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  /**
   * Get all stored notifications for a user
   */
  public static getStoredNotifications(userId: string): NotificationItem[] {
    try {
      const raw = localStorage.getItem(`${NOTIFICATIONS_STORAGE_KEY}_${userId}`);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  /**
   * Save notifications list for a user
   */
  private static saveNotifications(userId: string, items: NotificationItem[]) {
    try {
      localStorage.setItem(`${NOTIFICATIONS_STORAGE_KEY}_${userId}`, JSON.stringify(items));
      window.dispatchEvent(new CustomEvent(TRUCKIO_NOTIFICATIONS_CHANGED));
    } catch (err) {
      console.error('Error saving notifications:', err);
    }
  }

  /**
   * Checks maintenance plans for the driver's vehicle and generates alerts
   * when threshold <= 15% (Warning) or <= 0% (Overdue).
   */
  public static async checkDriverMaintenanceAlerts(
    user: User,
    vehicles: Vehicle[],
    plans: MaintenancePlan[]
  ): Promise<NotificationItem[]> {
    if (!user || user.role !== 'driver') return [];

    // Find driver's assigned vehicle or fallback to active truck
    const assignedVehicle =
      vehicles.find((v) => v.id === user.assigned_vehicle_id) ||
      vehicles.find((v) => v.type === 'truck');

    if (!assignedVehicle) return [];

    const vehiclePlans = plans.filter((p) => p.vehicle_id === assignedVehicle.id);
    if (vehiclePlans.length === 0) return [];

    const existingNotifications = this.getStoredNotifications(user.id);
    const newAlerts: NotificationItem[] = [];

    for (const plan of vehiclePlans) {
      let currentVal = 0;
      let unit = 'km';

      if (plan.trigger_type === 'mileage') {
        currentVal = assignedVehicle.current_mileage;
        unit = 'km';
      } else if (plan.trigger_type === 'engine_hours') {
        currentVal = assignedVehicle.current_engine_hours;
        unit = 'hs';
      } else if (plan.trigger_type === 'time_interval') {
        unit = 'días';
        if (plan.last_service_date) {
          const lastDate = new Date(plan.last_service_date).getTime();
          const now = Date.now();
          currentVal = Math.max(0, Math.floor((now - lastDate) / (1000 * 60 * 60 * 24)));
        } else {
          currentVal = 0;
        }
      }

      const nextDue = plan.last_service_value + plan.target_value;
      const remaining = nextDue - currentVal;
      const targetSpan = plan.target_value;
      const percentRemaining = targetSpan > 0 ? (remaining / targetSpan) * 100 : 100;

      const isOverdue = remaining <= 0;
      const isWarning = remaining > 0 && percentRemaining <= 15;

      if (isOverdue || isWarning) {
        const alertType = isOverdue ? 'maintenance_overdue' : 'maintenance_warning';
        const notificationId = `notif_${user.id}_${plan.id}_${alertType}`;

        // Check if this exact notification was already generated recently
        const alreadyExists = existingNotifications.some((n) => n.id === notificationId);

        const title = isOverdue
          ? `🔴 ¡Mantenimiento Vencido! [${assignedVehicle.license_plate}]`
          : `⚠️ Alerta Preventiva: Próximo Vencimiento [${assignedVehicle.license_plate}]`;

        const body = isOverdue
          ? `La tarea "${plan.title}" en tu ${assignedVehicle.brand} ha superado el límite por ${Math.abs(remaining).toLocaleString('es-AR')} ${unit}. Detén la unidad o avisa a flota para programar taller.`
          : `Resta solo ${remaining.toLocaleString('es-AR')} ${unit} (${Math.round(percentRemaining)}% de margen) para "${plan.title}". Coordina turno con el gestor de flota.`;

        const remainingText = isOverdue
          ? `Vencido por ${Math.abs(remaining).toLocaleString('es-AR')} ${unit}`
          : `Faltan ${remaining.toLocaleString('es-AR')} ${unit} (${Math.round(percentRemaining)}%)`;

        const item: NotificationItem = {
          id: notificationId,
          userId: user.id,
          vehicleId: assignedVehicle.id,
          planId: plan.id,
          type: alertType,
          title,
          body,
          remainingText,
          percentRemaining: Math.round(percentRemaining),
          read: false,
          created_at: new Date().toISOString(),
        };

        if (!alreadyExists) {
          newAlerts.push(item);

          // Dispatch native browser notification if allowed
          this.dispatchSystemNotification(title, body);
        }
      }
    }

    if (newAlerts.length > 0) {
      const updatedList = [...newAlerts, ...existingNotifications];
      this.saveNotifications(user.id, updatedList);
    }

    return this.getStoredNotifications(user.id);
  }

  /**
   * Triggers Service Worker Notification (persists in background/closed app and vibrates)
   */
  public static async dispatchSystemNotification(
    title: string,
    body: string,
    extraOptions: { tag?: string; vehicleId?: string; planId?: string } = {}
  ): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return false;
    }

    const options: any = {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: extraOptions.tag || 'truckio-critical-maintenance',
      renotify: true,
      requireInteraction: true,
      data: {
        url: '/',
        timestamp: Date.now(),
        ...extraOptions,
      },
    };

    // Use ServiceWorkerRegistration.showNotification if available
    // This allows the notification to be displayed by the background worker even when app is minimized
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, options);
          return true;
        }
      } catch (swErr) {
        console.warn('Fallo al despachar notificación vía Service Worker, recurriendo a ventana:', swErr);
      }
    }

    // Fallback to standard Window Notification constructor
    try {
      new Notification(title, options);
      return true;
    } catch (winErr) {
      console.warn('No se pudo mostrar notificación nativa:', winErr);
      return false;
    }
  }

  /**
   * Dispatches a critical maintenance push alert via Service Worker
   * Can be invoked from anywhere in the application or background timer
   */
  public static async sendCriticalMaintenancePush(
    vehicle: Vehicle,
    planTitle: string,
    detailMessage: string
  ): Promise<boolean> {
    const title = `🚨 CRÍTICO • ${vehicle.license_plate}: ${planTitle}`;
    const body = `${detailMessage}. Requiere intervención inmediata para evitar roturas mayores.`;

    return await this.dispatchSystemNotification(title, body, {
      tag: `critical-${vehicle.id}`,
      vehicleId: vehicle.id,
    });
  }

  /**
   * Simulates a real background Push Notification after a brief delay
   * Allows the driver or fleet manager to minimize the browser or switch tabs to test
   */
  public static async testBackgroundPushSimulation(
    vehiclePlate: string = 'AE 482 OK',
    delaySeconds: number = 3
  ): Promise<string> {
    const perm = await this.requestPermission();
    if (perm !== 'granted') {
      return 'Permiso de notificaciones no concedido. Por favor habilítalas en el navegador.';
    }

    setTimeout(async () => {
      await this.dispatchSystemNotification(
        `🚨 PUSH EN SEGUNDO PLANO • [${vehiclePlate}]`,
        `Alerta de servicio preventivo vencido detectada por el servidor central de flota.`,
        { tag: 'truckio-bg-test' }
      );
    }, delaySeconds * 1000);

    return `Notificación push programada para dentro de ${delaySeconds} segundos. ¡Minimiza la ventana o cambia de pestaña para probarla en segundo plano!`;
  }

  /**
   * Mark a specific notification as read
   */
  public static markAsRead(userId: string, notificationId: string) {
    const list = this.getStoredNotifications(userId);
    const updated = list.map((item) =>
      item.id === notificationId ? { ...item, read: true } : item
    );
    this.saveNotifications(userId, updated);
  }

  /**
   * Mark all notifications as read
   */
  public static markAllAsRead(userId: string) {
    const list = this.getStoredNotifications(userId);
    const updated = list.map((item) => ({ ...item, read: true }));
    this.saveNotifications(userId, updated);
  }

  /**
   * Clear all notifications for user
   */
  public static clearAll(userId: string) {
    this.saveNotifications(userId, []);
  }

  /**
   * Count unread notifications
   */
  public static getUnreadCount(userId: string): number {
    const list = this.getStoredNotifications(userId);
    return list.filter((n) => !n.read).length;
  }
}
