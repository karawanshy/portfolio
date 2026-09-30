// Converts the hero portrait cutout (transparent PNG) into optimized WebP files.
// Usage: node scripts/optimize-portrait.mjs <path-to-cutout.png>
// Writes src/assets/portrait/karawan-{720,360}.webp. Swap the source and re-run.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/optimize-portrait.mjs <path-to-cutout.png>');
  process.exit(1);
}
const outDir = resolve('src/assets/portrait');
mkdirSync(outDir, { recursive: true });

// 720w covers the 360px desktop slot at 2x; 360w covers the 180px mobile slot at 2x.
for (const width of [720, 360]) {
  const out = resolve(outDir, `karawan-${width}.webp`);
  const info = await sharp(src)
    .resize({ width })
    .webp({ quality: 84, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(out);
  console.log(`${out}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(1)} KB`);
}
