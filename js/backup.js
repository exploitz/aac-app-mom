// Full backup to a single JSON file (boards, profiles, photos, recordings)
// and restore from one. This is mom's safety net if a device breaks or is
// taken - and, via share, how boards travel between family devices.
import * as db from './db.js';

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function dataURLToBlob(dataURL) {
  return (await fetch(dataURL)).blob();
}

async function storeToObject(store) {
  const out = {};
  for (const key of await db.getAllKeys(store)) {
    const blob = await db.get(store, key);
    if (blob) out[key] = await blobToDataURL(blob);
  }
  return out;
}

async function buildPayload() {
  const [profiles, boards, images, sounds] = await Promise.all([
    db.getAll('profiles'), db.getAll('boards'), storeToObject('images'), storeToObject('sounds'),
  ]);
  return { app: 'ourvoice', version: 2, exportedAt: new Date().toISOString(), profiles, boards, images, sounds };
}

function payloadFile(payload) {
  const stamp = payload.exportedAt.slice(0, 10);
  return new File([JSON.stringify(payload)], `ourvoice-backup-${stamp}.json`, { type: 'application/json' });
}

export async function exportAll() {
  const payload = await buildPayload();
  const file = payloadFile(payload);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
  return { profiles: payload.profiles.length, boards: payload.boards.length, images: Object.keys(payload.images).length };
}

// One-tap transfer: AirDrop / Messages / email via the system share sheet.
// Returns false when the platform can't share files (caller falls back).
export async function shareAll() {
  const payload = await buildPayload();
  const file = payloadFile(payload);
  if (!navigator.canShare || !navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ files: [file], title: 'Our Voice boards' });
    return true;
  } catch (err) {
    if (err.name === 'AbortError') return true; // user closed the sheet - not an error
    return false;
  }
}

export async function importAll(file) {
  const payload = JSON.parse(await file.text());
  if (payload.app !== 'ourvoice' || !Array.isArray(payload.profiles)) {
    throw new Error('Not an Our Voice backup file');
  }
  await db.clearAll();
  for (const p of payload.profiles) await db.put('profiles', p);
  for (const b of payload.boards) await db.put('boards', b);
  for (const [key, dataURL] of Object.entries(payload.images || {})) {
    await db.put('images', await dataURLToBlob(dataURL), key);
  }
  for (const [key, dataURL] of Object.entries(payload.sounds || {})) {
    await db.put('sounds', await dataURLToBlob(dataURL), key);
  }
  return { profiles: payload.profiles.length, boards: payload.boards.length };
}
