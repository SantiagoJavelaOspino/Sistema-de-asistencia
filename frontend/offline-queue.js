/**
 * SENA ATTENDANCE SYSTEM - Offline Queue Manager (Capa 1: Experiencia / Offline)
 * Almacena marcaciones de asistencia en localStorage cuando no hay señal y las
 * sincroniza con deduplicación, idempotencia, reintentos controlados y manejo visible de conflictos.
 */

const QUEUE_STORAGE_KEY = 'sena_attendance_offline_queue';
const MAX_RETRIES = 5;

export function buildIdempotencyKey(checkinData = {}) {
  const token = String(checkinData.token || 'manual').trim().toUpperCase();
  const documento = String(checkinData.documento || '').trim();
  const sessionId = String(checkinData.sessionId || '').trim();
  return `${sessionId || token}::${documento}`;
}

export class OfflineAttendanceQueue {
  constructor(options = {}) {
    this.storageKey = options.storageKey || QUEUE_STORAGE_KEY;
    this.apiBaseUrl = options.apiBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    this.isSyncing = false;
    this.onQueueChangeCallbacks = [];
    this.onSyncCompleteCallbacks = [];
    this.onConflictCallbacks = [];

    this._initListeners();
  }

  getQueue() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  _saveQueue(queue) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(queue));
      this._notifyQueueChange(queue);
    } catch (e) {
      console.error('Error saving offline queue to localStorage:', e);
    }
  }

  /**
   * Encola una marcación evitando duplicados por clave de idempotencia (token/session + documento).
   */
  enqueue(checkinData) {
    const queue = this.getQueue();
    const idempotencyKey = checkinData.idempotencyKey || buildIdempotencyKey(checkinData);

    const existing = queue.find((item) => item.idempotencyKey === idempotencyKey);
    if (existing) {
      return existing;
    }

    const item = {
      id: 'offline_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      idempotencyKey,
      queuedAt: new Date().toISOString(),
      retries: 0,
      status: 'pending',
      lastError: null,
      data: { ...checkinData, idempotencyKey }
    };
    queue.push(item);
    this._saveQueue(queue);
    return item;
  }

  remove(id) {
    const queue = this.getQueue().filter((item) => item.id !== id);
    this._saveQueue(queue);
  }

  dismissConflict(id) {
    this.remove(id);
  }

  clear() {
    this._saveQueue([]);
  }

  get pendingCount() {
    return this.getQueue().filter((item) => item.status !== 'conflict').length;
  }

  get conflicts() {
    return this.getQueue().filter((item) => item.status === 'conflict');
  }

  async syncAll(authToken = '') {
    if (this.isSyncing) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    const queue = this.getQueue();
    if (queue.length === 0) {
      return { synced: 0, failed: 0, conflicts: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;
    let conflicts = 0;
    const remainingQueue = [];

    for (const item of queue) {
      if (item.status === 'conflict') {
        remainingQueue.push(item);
        conflicts++;
        continue;
      }

      try {
        const { token, documento, verification_method } = item.data;
        const targetUrl = (this.apiBaseUrl || '') + '/public/attendance/' + encodeURIComponent(token || 'manual') + '/register';

        const headers = {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': item.idempotencyKey
        };
        if (authToken) {
          headers['Authorization'] = 'Bearer ' + authToken;
        }

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            documento,
            verification_method: verification_method || 'offline_sync',
            idempotency_key: item.idempotencyKey,
            offline_queued_at: item.queuedAt
          })
        });

        if (response.ok || response.status === 200 || response.status === 201 || response.status === 409) {
          // 409 (ya registrado) es idempotente: se limpia de la cola
          synced++;
        } else if (response.status >= 400 && response.status < 500) {
          const errData = await response.json().catch(() => ({}));
          item.status = 'conflict';
          item.lastError = errData.error?.message || `Conflicto HTTP ${response.status}`;
          remainingQueue.push(item);
          conflicts++;
          this._notifyConflict(item);
        } else {
          const errData = await response.json().catch(() => ({}));
          item.retries = (item.retries || 0) + 1;
          item.lastError = errData.error?.message || 'Error temporal del servidor';
          if (item.retries < MAX_RETRIES) {
            remainingQueue.push(item);
          } else {
            item.status = 'conflict';
            remainingQueue.push(item);
            failed++;
            conflicts++;
            this._notifyConflict(item);
          }
        }
      } catch {
        item.retries = (item.retries || 0) + 1;
        item.lastError = 'Error de red durante la sincronización';
        remainingQueue.push(item);
        failed++;
        break;
      }
    }

    this._saveQueue(remainingQueue);
    this.isSyncing = false;

    const stats = { synced, failed, conflicts, remaining: remainingQueue.length };
    this._notifySyncComplete(stats);
    return stats;
  }

  onQueueChange(cb) {
    if (typeof cb === 'function') this.onQueueChangeCallbacks.push(cb);
  }

  onSyncComplete(cb) {
    if (typeof cb === 'function') this.onSyncCompleteCallbacks.push(cb);
  }

  onConflict(cb) {
    if (typeof cb === 'function') this.onConflictCallbacks.push(cb);
  }

  _notifyQueueChange(queue) {
    for (const cb of this.onQueueChangeCallbacks) {
      try { cb(queue); } catch (e) { console.error(e); }
    }
  }

  _notifySyncComplete(stats) {
    for (const cb of this.onSyncCompleteCallbacks) {
      try { cb(stats); } catch (e) { console.error(e); }
    }
  }

  _notifyConflict(item) {
    for (const cb of this.onConflictCallbacks) {
      try { cb(item); } catch (e) { console.error(e); }
    }
  }

  _initListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.syncAll();
      });

      setInterval(() => {
        if (typeof navigator !== 'undefined' && navigator.onLine && this.pendingCount > 0) {
          this.syncAll();
        }
      }, 30000);
    }
  }
}

export const offlineQueue = new OfflineAttendanceQueue();
