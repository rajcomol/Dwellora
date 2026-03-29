/**
 * Maakt bijna-wit/crème pixels in het wordmark-PNG transparant (éénmalig uitvoeren na export).
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const inputPath = path.join(root, "public", "brand", "dwellora-logo-wordmark-v3.png");

function knockOutCreamWhite(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const lum = (r + g + b) / 3;
  // Zeer lichte, bijna grijze/crème vlakken (achtergrond)
  if (lum > 232 && sat < 28) return true;
  // Strakke drempel voor duidelijk wit/crème
  if (r > 230 && g > 228 && b > 222) return true;
  return false;
}

const input = sharp(inputPath).ensureAlpha();
const { data, info } = await input.raw().toBuffer({ resolveWithObject: true });
if (info.channels !== 4) {
  throw new Error(`Expected RGBA, got ${info.channels} channels`);
}

const out = new Uint8ClampedArray(data);
for (let i = 0; i < out.length; i += 4) {
  const r = out[i];
  const g = out[i + 1];
  const b = out[i + 2];
  if (knockOutCreamWhite(r, g, b)) {
    out[i + 3] = 0;
  }
}

const processed = await sharp(Buffer.from(out), {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .png()
  .toBuffer();

fs.writeFileSync(inputPath, processed);
console.log("Updated:", inputPath, `(${info.width}x${info.height})`);
