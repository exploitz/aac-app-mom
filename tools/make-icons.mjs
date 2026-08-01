// Generates the app icons as PNGs with zero dependencies (node's zlib does the
// PNG compression). Design: indigo rounded square, white speech bubble, four
// colored "board" dots. Run: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let c, table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- tiny software rasterizer (signed-distance shapes, 3x supersampled) ---
const BG = [0x3b, 0x5b, 0xdb], WHITE = [255, 255, 255];
const DOTS = [
  [0xff, 0xd4, 0x3b], // yellow
  [0x51, 0xcf, 0x66], // green
  [0x33, 0x9a, 0xf0], // blue
  [0xf7, 0x83, 0xac], // pink
];

function sdRoundRect(x, y, cx, cy, hw, hh, r) {
  const dx = Math.abs(x - cx) - (hw - r);
  const dy = Math.abs(y - cy) - (hh - r);
  const ox = Math.max(dx, 0), oy = Math.max(dy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(dx, dy), 0) - r;
}
const sdCircle = (x, y, cx, cy, r) => Math.hypot(x - cx, y - cy) - r;

function render(size, withBg) {
  const rgba = Buffer.alloc(size * size * 4);
  const S = 3; // supersampling
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let acc = [0, 0, 0, 0];
      for (let sy = 0; sy < S; sy++) {
        for (let sx = 0; sx < S; sx++) {
          const x = (px + (sx + .5) / S) / size;
          const y = (py + (sy + .5) / S) / size;
          let color = null; // transparent
          // Background rounded square (full square for maskable/touch icons).
          if (sdRoundRect(x, y, .5, .5, withBg ? .5 : .46, withBg ? .5 : .46, withBg ? 0 : .11) < 0) color = BG;
          // Speech bubble: rounded rect + tail triangle-ish circle blend.
          if (color) {
            const bubble = sdRoundRect(x, y, .5, .44, .28, .20, .09);
            const tail = sdCircle(x, y, .40, .68, .075);
            if (Math.min(bubble, tail) < 0) color = WHITE;
            // Four board dots inside the bubble.
            const pos = [[.38, .36], [.62, .36], [.38, .52], [.62, .52]];
            pos.forEach(([cx, cy], i) => {
              if (sdCircle(x, y, cx, cy, .066) < 0) color = DOTS[i];
            });
          }
          if (color) {
            acc[0] += color[0]; acc[1] += color[1]; acc[2] += color[2]; acc[3] += 255;
          }
        }
      }
      const n = S * S, o = (py * size + px) * 4;
      const a = acc[3] / n;
      rgba[o] = acc[0] / n; rgba[o + 1] = acc[1] / n; rgba[o + 2] = acc[2] / n; rgba[o + 3] = a;
    }
  }
  return png(size, size, rgba);
}

mkdirSync(new URL('../icons/', import.meta.url), { recursive: true });
const out = (name, buf) => writeFileSync(new URL(`../icons/${name}`, import.meta.url), buf);
out('icon-192.png', render(192, false));
out('icon-512.png', render(512, false));
out('apple-touch-icon.png', render(180, true)); // iOS rounds corners itself
console.log('icons written: icon-192.png, icon-512.png, apple-touch-icon.png');
