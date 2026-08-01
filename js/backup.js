// Full backup to a single JSON file (boards, profiles, photos as base64) and
// restore from one. This is mom's safety net if a device breaks or is taken.
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

export async function exportAll() {
  const [profiles, boards, imageKeys] = await Promise.all([
    db.getAll('profiles'), db.getAll('boards'), db.getAllKeys('images'),
  ]);
  const images = {};
  for (const key of imageKeys) {
    const blob = await db.get('images', key);
    if (blob) images[key] = await blobToDataURL(blob);
  }
  const payload = { app: 'ourvoice', version: 1, exportedAt: new Date().toISOString(), profiles, boards, images };
  const file = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  const stamp = payload.exportedAt.slice(0, 10);
  a.download = `ourvoice-backup-${stamp}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  return { profiles: profiles.length, boards: boards.length, images: imageKeys.length };
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
  return { profiles: payload.profiles.length, boards: payload.boards.length };
}
