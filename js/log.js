// Local usage log ("data logging" in AAC terms) - what was said and when.
// Stays on the device. Exportable as CSV for a speech-language pathologist.
import * as db from './db.js';
import { uid } from './model.js';

export function logEvent(profileId, type, text) {
  // type: 'word' | 'sentence' | 'keyboard'
  if (!text) return;
  db.put('logs', { id: uid(), ts: Date.now(), profileId, type, text }).catch(() => {});
}

export async function getLogs(profileId, limit = 200) {
  const all = await db.getAll('logs');
  return all
    .filter(l => !profileId || l.profileId === profileId)
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit);
}

export async function clearLogs() {
  const all = await db.getAll('logs');
  for (const l of all) await db.del('logs', l.id);
  return all.length;
}

export async function exportCSV(profilesById) {
  const all = (await db.getAll('logs')).sort((a, b) => a.ts - b.ts);
  const esc = s => `"${String(s).replaceAll('"', '""')}"`;
  const rows = [['time', 'profile', 'type', 'text']];
  for (const l of all) {
    rows.push([new Date(l.ts).toISOString(), profilesById.get(l.profileId)?.name || l.profileId, l.type, l.text]);
  }
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = `ourvoice-usage-log.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
  return all.length;
}
