// ARASAAC symbol search (CC BY-NC-SA, Government of Aragon).
// API + CDN both send Access-Control-Allow-Origin: * (verified 2026-07-31),
// so picked symbols are downloaded and stored as local blobs for offline use.
const API = 'https://api.arasaac.org/api/pictograms';
const CDN = 'https://static.arasaac.org/pictograms';

export async function searchSymbols(query, lang = 'en') {
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const res = await fetch(`${API}/${lang}/search/${q}`);
  if (!res.ok) return [];
  const items = await res.json();
  return items.slice(0, 24).map(it => ({
    id: it._id,
    url: `${CDN}/${it._id}/${it._id}_300.png`,
  }));
}

export async function downloadSymbol(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`symbol download failed: ${res.status}`);
  return res.blob();
}

// Shrink a photo so IndexedDB stays small and grids render fast.
export function resizePhoto(file, maxDim = 512) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('photo convert failed'))),
        'image/jpeg', 0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('photo load failed')); };
    img.src = url;
  });
}
