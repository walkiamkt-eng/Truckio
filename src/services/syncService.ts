import { supabase } from '../lib/supabase';
import { StorageService } from './storageService';

export interface PendingAction {
  id: string;
  type: 'CREATE_ISSUE' | 'UPDATE_ISSUE' | 'CREATE_VEHICLE' | 'UPDATE_VEHICLE' | 'CREATE_PLAN';
  payload: any;
  createdAt: string;
  attempts: number;
}

const QUEUE_STORAGE_KEY = 'pistinapp_pending_sync_queue';

export class SyncService {
  static getQueue(): PendingAction[] {
    try {
      const data = localStorage.getItem(QUEUE_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private static saveQueue(queue: PendingAction[]): void {
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
  }

  static enqueueAction(type: PendingAction['type'], payload: any): void {
    const queue = this.getQueue();
    const newAction: PendingAction = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: new Date().toISOString(),
      attempts: 0,
    };
    queue.push(newAction);
    this.saveQueue(queue);
    console.log(`[SyncService] Acción encolada (${type}):`, newAction);
  }

  static async processQueue(): Promise<{ success: number; failed: number }> {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: 0, failed: 0 };

    console.log(`[SyncService] Procesando ${queue.length} acciones pendientes...`);
    let successCount = 0;
    let failedCount = 0;
    const remainingQueue: PendingAction[] = [];

    for (const action of queue) {
      try {
        const success = await this.executeAction(action);
        if (success) {
          successCount++;
        } else {
          action.attempts += 1;
          if (action.attempts < 5) remainingQueue.push(action);
          failedCount++;
        }
      } catch (error) {
        console.error(`[SyncService] Error al ejecutar acción ${action.type}:`, error);
        action.attempts += 1;
        if (action.attempts < 5) remainingQueue.push(action);
        failedCount++;
      }
    }

    this.saveQueue(remainingQueue);

    if (successCount > 0) {
      await StorageService.refreshFromCloud();
    }

    return { success: successCount, failed: failedCount };
  }

  private static async executeAction(action: PendingAction): Promise<boolean> {
  switch (action.type) {
    case 'CREATE_ISSUE': {
      const { id, synced, reporter_id, reported_by_user_id, ...issueData } = action.payload;

      const payloadToInsert = {
        ...issueData,
        reported_by: reported_by_user_id || reporter_id || null,
      };

      const { error } = await supabase.from('issues').insert([payloadToInsert]);
      if (error) throw error;
      return true;
    }

    case 'UPDATE_ISSUE': {
      const { id, ...updates } = action.payload;
      const { error } = await supabase.from('issues').update(updates).eq('id', id);
      if (error) throw error;
      return true;
    }

    case 'CREATE_VEHICLE': {
      const { id, synced, ...vehicleData } = action.payload;
      const { error } = await supabase.from('vehicles').insert([vehicleData]);
      if (error) throw error;
      return true;
    }

    default:
      return true;
  }
}
}