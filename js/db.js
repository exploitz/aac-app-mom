// Tiny promise wrapper around IndexedDB. Stores:
//   profiles (id), boards (id, index profileId), images (id -> Blob), meta (key)
const DB_NAME = 'ourvoice';
const DB_VERSION = 1;

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('profiles')) db.createObjectStore('profiles', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('boards')) {
        const boards = db.createObjectStore('boards', { keyPath: 'id' });
        boards.createIndex('profileId', 'profileId');
      }
      if (!db.objectStoreNames.contains('images')) db.createObjectStore('images');
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(db, store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out?.result !== undefined ? out.result : undefined);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

export async function put(store, value, key) {
  const db = await openDB();
  return tx(db, store, 'readwrite', s => (key !== undefined ? s.put(value, key) : s.put(value)));
}

export async function get(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function del(store, key) {
  const db = await openDB();
  return tx(db, store, 'readwrite', s => s.delete(key));
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllKeys(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(store).objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function boardsForProfile(profileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('boards').objectStore('boards').index('profileId').getAll(profileId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function clearAll() {
  const db = await openDB();
  for (const store of ['profiles', 'boards', 'images', 'meta']) {
    await tx(db, store, 'readwrite', s => s.clear());
  }
}
