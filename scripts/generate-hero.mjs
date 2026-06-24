/**
 * generate-hero.mjs
 * Genereert de hero-afbeelding voor de RenoTasker marketingpagina via OpenAI.
 *
 * Gebruik:
 *   1. Zorg dat OPENAI_API_KEY in je omgeving staat (of in .env.local).
 *   2. Draai:  node scripts/generate-hero.mjs
 *   3. Resultaat komt in public/marketing/hero.png
 *
 * Let op: dit script gebruikt het OpenAI image-model. Eén generatie op hoge
 * kwaliteit kost een paar dozijn cent. Je kunt de prompt onderaan aanpassen
 * en opnieuw draaien tot je tevreden bent.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----- Configuratie -------------------------------------------------------

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
// gpt-image ondersteunt 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait).
// Voor een hero willen we breed/landscape:
const SIZE = "1536x1024";
const QUALITY = "high"; // 'low' | 'medium' | 'high'

const OUTPUT_DIR = path.resolve(__dirname, "..", "public", "marketing");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "hero.png");

// ----- De prompt ----------------------------------------------------------
// Doelgroep: gewone Nederlandse huiseigenaar die zijn eigen woonkamer verbouwt.
// Geen hotel, geen luxe pand, geen kantoor. Herkenbaar, warm, met daglicht.
// De transformatie "van ruwbouw naar droomhuis" zichtbaar in één beeld.

const PROMPT = `
A photorealistic wide landscape photograph of a beautiful, freshly renovated
family living room in a normal suburban home. Warm and cozy yet modern: a
comfortable linen sofa with cushions, a natural oak wood floor, a soft rug,
a couple of green plants, a wooden coffee table, and tasteful warm lighting.
Large windows let in plenty of soft natural daylight. The style is calm,
inviting and aspirational — the kind of dream living room a regular Dutch
family would create after renovating their own home. NOT a hotel, NOT a luxury
mansion, NOT a showroom, NOT an office — a real, relatable family home that
feels lived-in and warm. Professional interior photography, shot with a wide
lens, bright and airy, high detail, photorealistic. Composition has calm open
space on one side (a plain wall or soft background) suitable for overlaying
large headline text.
`.trim();

// --------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "OPENAI_API_KEY ontbreekt. Zet die in je omgeving of .env.local en probeer opnieuw."
    );
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log(`Genereren met model ${MODEL}, ${SIZE}, kwaliteit ${QUALITY}...`);
  console.log("Dit kan 1-2 minuten duren bij hoge kwaliteit.");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: PROMPT,
      size: SIZE,
      quality: QUALITY,
      n: 1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`OpenAI fout (${res.status}):`, text);
    process.exit(1);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;

  if (!b64) {
    console.error("Geen afbeelding ontvangen. Antwoord:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  fs.writeFileSync(OUTPUT_FILE, Buffer.from(b64, "base64"));
  console.log(`Klaar! Hero-afbeelding opgeslagen in: ${OUTPUT_FILE}`);
  console.log(`Formaat: ${SIZE}. Pas HERO_IMAGE in constants.ts aan naar "/marketing/hero.png".`);
}

main().catch((err) => {
  console.error("Onverwachte fout:", err);
  process.exit(1);
});
