/**
 * Single source: `public/brand/renotasker-logo-source.png` (canonical name).
 * Output: `public/brand/renotasker-logo-new.png` — achtergrond transparant, logo behouden,
 * geen glow, geen kleurverschuiving (grayscale bron → wit op transparant waar van toepassing).
 *
 * Gebruik: node scripts/build-renotasker-logo-transparent.mjs
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const brandDir = path.join(root, "public", "brand");

/** Canonical bronbestand (ASCII naam; symlink of kopie van het ontwerpbestand). */
const SOURCE = path.join(brandDir, "renotasker-logo-source.png");
const OUT = path.join(brandDir, "renotasker-logo-new.png");

/** BFS: als kleur binnen deze Manhattan-afstand van een achtergrondpixel blijft, blijft het bg. */
const BG_SIMILAR = 11;
/** Rand als achtergrond als alle kanalen binnen dit bereik van het gemiddelde van de rand zitten. */
const EDGE_MATCH = 14;
/** Niet verder vullen dan dit (voorkomt lekken via anti-alias naar wit voorgrond). */
const BG_LUM_MAX = 142;

function lum(r, g, b) {
  return (r + g + b) / 3;
}

function manhattan(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function isGrayish(r, g, b) {
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  return mx - mn < 22;
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error("Bron ontbreekt:", SOURCE);
    process.exit(1);
  }

  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) throw new Error(`Verwacht RGBA, kreeg ${info.channels} kanalen`);

  const w = info.width;
  const h = info.height;
  const rgba = new Uint8ClampedArray(data);
  const borderSamples = [];

  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const i = (y * w + x) * 4;
      borderSamples.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const i = (y * w + x) * 4;
      borderSamples.push([rgba[i], rgba[i + 1], rgba[i + 2]]);
    }
  }

  let br = 0;
  let bg = 0;
  let bb = 0;
  for (const [r, g, b] of borderSamples) {
    br += r;
    bg += g;
    bb += b;
  }
  const n = borderSamples.length;
  const ref = [br / n, bg / n, bb / n];

  const bgMask = new Uint8Array(w * h);
  const queue = [];

  function trySeed(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const idx = y * w + x;
    if (bgMask[idx]) return;
    const i = idx * 4;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    if (
      Math.abs(r - ref[0]) <= EDGE_MATCH &&
      Math.abs(g - ref[1]) <= EDGE_MATCH &&
      Math.abs(b - ref[2]) <= EDGE_MATCH
    ) {
      bgMask[idx] = 1;
      queue.push(idx);
    }
  }

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    const i = idx * 4;
    const cr = rgba[i];
    const cg = rgba[i + 1];
    const cb = rgba[i + 2];
    const cx = idx % w;
    const cy = (idx / w) | 0;

    const neighbors = [
      cx > 0 ? idx - 1 : -1,
      cx + 1 < w ? idx + 1 : -1,
      cy > 0 ? idx - w : -1,
      cy + 1 < h ? idx + w : -1,
    ];

    for (const nidx of neighbors) {
      if (nidx < 0 || bgMask[nidx]) continue;
      const j = nidx * 4;
      const nr = rgba[j];
      const ng = rgba[j + 1];
      const nb = rgba[j + 2];
      if (lum(nr, ng, nb) > BG_LUM_MAX) continue;
      if (manhattan([nr, ng, nb], [cr, cg, cb]) <= BG_SIMILAR) {
        bgMask[nidx] = 1;
        queue.push(nidx);
      }
    }
  }

  const out = new Uint8ClampedArray(rgba.length);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];

      if (bgMask[idx]) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
        continue;
      }

      // Kleurrijke voorgrond (toekomstbestendig): zo min mogelijk aanpassen.
      if (!isGrayish(r, g, b)) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
        continue;
      }

      // Grayscale voorgrond: wit/licht op transparant; anti-alias via luminantie.
      const L = lum(r, g, b);
      const bgL = lum(ref[0], ref[1], ref[2]);
      let t = (L - bgL) / (255 - bgL);
      t = Math.max(0, Math.min(1, t));
      const a = Math.round(t * 255);
      if (a <= 0) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      } else if (a >= 255) {
        out[i] = r;
        out[i + 1] = g;
        out[i + 2] = b;
        out[i + 3] = 255;
      } else {
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
        out[i + 3] = a;
      }
    }
  }

  let png = await sharp(Buffer.from(out), {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  png = await sharp(png).trim().png({ compressionLevel: 9 }).toBuffer();

  fs.writeFileSync(OUT, png);
  const meta = await sharp(OUT).metadata();
  console.log("Wrote", OUT, `${meta.width}x${meta.height}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
