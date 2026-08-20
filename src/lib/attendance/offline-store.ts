/**
 * Offline-First IndexedDB Punch Event Storage & Sync Manager
 */

export interface OfflinePunchItem {
  id: string;
  token: string;
  action: 'check_in' | 'check_out' | 'break_start' | 'break_end';
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  selfieBase64: string;
  notes?: string;
  locationId?: string;
  shiftId?: string;
  createdAt: number;
}

const DB_NAME = 'fw_attendance_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'punches';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves an offline punch event to IndexedDB.
 */
export async function saveOfflinePunch(punch: Omit<OfflinePunchItem, 'id' | 'createdAt'>): Promise<string> {
  try {
    const db = await openDB();
    const id = `punch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const item: OfflinePunchItem = {
      ...punch,
      id,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(item);

      req.onsuccess = () => resolve(id);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    // Fallback to localStorage if IndexedDB fails
    const queueStr = localStorage.getItem('fw_offline_attendance') || '[]';
    const queue = JSON.parse(queueStr);
    const id = `punch_${Date.now()}`;
    queue.push({ ...punch, id, createdAt: Date.now() });
    localStorage.setItem('fw_offline_attendance', JSON.stringify(queue));
    return id;
  }
}

/**
 * Retrieves all stored offline punches.
 */
export async function getOfflinePunches(): Promise<OfflinePunchItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    const queueStr = localStorage.getItem('fw_offline_attendance') || '[]';
    return JSON.parse(queueStr);
  }
}

/**
 * Clears an offline punch by ID after successful sync.
 */
export async function removeOfflinePunch(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    const queueStr = localStorage.getItem('fw_offline_attendance') || '[]';
    const queue = JSON.parse(queueStr).filter((i: any) => i.id !== id);
    localStorage.setItem('fw_offline_attendance', JSON.stringify(queue));
  }
}

/**
 * Clears all synced punches.
 */
export async function clearAllOfflinePunches(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    localStorage.removeItem('fw_offline_attendance');
  }
}
