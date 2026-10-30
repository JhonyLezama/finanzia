import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = `${root}/public/icon.svg`;
const iconsDir = `${root}/public/icons`;

await mkdir(iconsDir, { recursive: true });

const outputs: Array<{ file: string; size: number }> = [
  { file: `${iconsDir}/icon-192.png`, size: 192 },
  { file: `${iconsDir}/icon-512.png`, size: 512 },
  { file: `${iconsDir}/maskable-512.png`, size: 512 },
  { file: `${root}/public/apple-touch-icon.png`, size: 180 },
  { file: `${root}/public/favicon-32.png`, size: 32 },
];

for (const output of outputs) {
  await sharp(source).resize(output.size, output.size).png().toFile(output.file);
  console.log(`generated ${output.file} (${output.size}px)`);
}
