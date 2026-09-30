// Generates public/og-image.png (1200×630): the Afterglow sky, a sun mark and the
// hero portrait. No text (web fonts aren't available to the rasterizer).
// Usage: node scripts/make-og-image.mjs
import sharp from 'sharp';

const W = 1200;
const H = 630;
const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1C0A18"/><stop offset="1" stop-color="#120812"/>
    </linearGradient>
    <radialGradient id="pink" cx="0.78" cy="0.25" r="0.6">
      <stop offset="0" stop-color="#FF3D8B" stop-opacity="0.45"/><stop offset="1" stop-color="#FF3D8B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tang" cx="0.08" cy="0.9" r="0.55">
      <stop offset="0" stop-color="#FF8A3D" stop-opacity="0.28"/><stop offset="1" stop-color="#FF8A3D" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FF8A3D"/><stop offset="1" stop-color="#FF3D8B"/>
    </linearGradient>
    <linearGradient id="satin" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#FF8A3D"/><stop offset="0.5" stop-color="#FF3D8B"/><stop offset="1" stop-color="#FF8A3D"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#base)"/>
  <rect width="100%" height="100%" fill="url(#pink)"/>
  <rect width="100%" height="100%" fill="url(#tang)"/>
  <g transform="translate(110 250) scale(5)">
    <path d="M2 26 A18 18 0 0 1 38 26 Z" fill="url(#sun)"/>
    <rect x="2" y="30" width="36" height="3" rx="1.5" fill="#FF3D8B" opacity="0.7"/>
    <rect x="8" y="35" width="24" height="3" rx="1.5" fill="#FF3D8B" opacity="0.4"/>
  </g>
</svg>`;
const front = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="satin" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#FF8A3D"/><stop offset="0.5" stop-color="#FF3D8B"/><stop offset="1" stop-color="#FF8A3D"/>
  </linearGradient></defs>
  <path d="M-40 560 C 300 540 600 600 800 520 S 1050 440 1240 470" fill="none" stroke="url(#satin)" stroke-width="34"/>
</svg>`;

const portrait = await sharp('src/assets/portrait/karawan-720.webp').resize({ height: 600 }).toBuffer();
const meta = await sharp(portrait).metadata();
await sharp(Buffer.from(bg))
  .composite([
    { input: portrait, left: W - (meta.width ?? 466) - 90, top: 40 },
    { input: Buffer.from(front), left: 0, top: 0 },
  ])
  .png({ compressionLevel: 9 })
  .toFile('public/og-image.png');
console.log('public/og-image.png written');
