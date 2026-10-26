import sharp from 'sharp';
import { mkdirSync } from 'fs';

const SOURCE = 'icon.png';
const BG = '#0A7B44'; // background behind the icon. Change it if your icon is also green.

mkdirSync('public', { recursive: true });

// Cut off any empty border around the artwork
const trimmed = await sharp(SOURCE).trim().png().toBuffer();

// Square icon: artwork centred on a solid background.
// `scale` is how much of the square the artwork may fill.
async function makeIcon(size, scale, file) {
  const inner = Math.round(size * scale);
  const art = await sharp(trimmed)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: art, gravity: 'center' }])
    .png()
    .toFile(`public/${file}`);

  console.log('made public/' + file);
}

await makeIcon(192, 0.72, 'pwa-192x192.png');
await makeIcon(512, 0.72, 'pwa-512x512.png');
await makeIcon(512, 0.58, 'pwa-maskable-512x512.png'); // Android crops this one into a circle or squircle, so it keeps extra padding
await makeIcon(180, 0.72, 'apple-touch-icon.png');     // iPhones round the corners themselves and don't allow transparency
await makeIcon(32, 0.9, 'favicon-32x32.png');
await makeIcon(48, 0.9, 'favicon-48x48.png');