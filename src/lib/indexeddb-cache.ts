/**
 * StudioCore IndexedDB Offline Cache & Sync Queue Engine
 * Enables seamless offline editing, outbox queuing, and automatic background sync.
 */

const DB_NAME = 'studiocore_saas_db';
const DB_VERSION = 1;
const STORE_DOCUMENTS = 'documents_cache';
const STORE_OUTBOX = 'offline_outbox';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_DOCUMENTS)) {
        db.createObjectStore(STORE_DOCUMENTS, { keyPath: 'templateId' });
      }
      if (!db.objectStoreNames.contains(STORE_OUTBOX)) {
        db.createObjectStore(STORE_OUTBOX, { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheDocumentLocal(templateId: string, documentJson: any, version: number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORE_DOCUMENTS);
    store.put({
      templateId,
      documentJson,
      version,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to cache document locally:', err);
  }
}

export async function getCachedDocumentLocal(templateId: string): Promise<{ documentJson: any; version: number } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORE_DOCUMENTS);
    return new Promise((resolve) => {
      const req = store.get(templateId);
      req.onsuccess = () => {
        if (req.result) {
          resolve({ documentJson: req.result.documentJson, version: req.result.version });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    return null;
  }
}

export async function queueOfflineMutation(templateId: string, payload: any): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    store.add({
      templateId,
      payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[IndexedDB Outbox] Failed to queue mutation:', err);
  }
}

export async function flushOfflineOutbox(syncCallback: (item: any) => Promise<boolean>): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_OUTBOX, 'readwrite');
    const store = tx.objectStore(STORE_OUTBOX);
    
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = async () => {
        const items = req.result || [];
        let successCount = 0;
        for (const item of items) {
          const success = await syncCallback(item);
          if (success) {
            successCount++;
            const deleteTx = db.transaction(STORE_OUTBOX, 'readwrite');
            deleteTx.objectStore(STORE_OUTBOX).delete(item.id);
          }
        }
        resolve(successCount);
      };
      req.onerror = () => resolve(0);
    });
  } catch (err) {
    return 0;
  }
}
