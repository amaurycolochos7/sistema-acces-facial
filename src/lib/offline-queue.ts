const DB_NAME = 'access-control-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-logs';

export interface PendingLog {
  id?: number;
  userId: string;
  type: 'ENTRY' | 'EXIT';
  confidence: number;
  exitReasonId?: string;
  exitNote?: string;
  timestamp?: string;
  synced: boolean;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('synced', 'synced', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineLog(log: Omit<PendingLog, 'id' | 'synced'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ ...log, synced: false, timestamp: new Date().toISOString() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingLogs(): Promise<PendingLog[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.objectStore(STORE_NAME).index('synced');
    const request = index.getAll(IDBKeyRange.only(0));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function markLogSynced(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.synced = true;
        store.put(record);
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncPendingLogs(): Promise<{ synced: number; failed: number }> {
  const pending = await getPendingLogs();
  let synced = 0;
  let failed = 0;

  for (const log of pending) {
    try {
      const res = await fetch('/api/access-logs/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: log.userId,
          type: log.type,
          confidence: log.confidence,
          exitReasonId: log.exitReasonId,
          exitNote: log.exitNote,
          isOfflineSync: true,
        }),
      });

      if (res.ok && log.id) {
        await markLogSynced(log.id);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

export async function getPendingCount(): Promise<number> {
  const pending = await getPendingLogs();
  return pending.length;
}
