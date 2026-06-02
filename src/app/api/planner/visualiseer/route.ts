import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { processImage, processImageToBuffer } from "@/lib/planner/imageProcessor";
import { ReimagineHomeError, runReimagineHomeRedesign } from "@/lib/planner/reimagineHome";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import type { RenderHoek } from "@/lib/planner/types";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { z } from "zod";

export const maxDuration = 300;

const BUCKET = "planner-renders";

const RENDER_HOEKEN: RenderHoek[] = ["structuur", "gebalanceerd", "maximaal"];

const base64ImageSchema = z.string().min(1).max(12_000_000, "Afbeelding is te groot.");
const optionalImageSchema = base64ImageSchema.optional().nullable();

const bodySchema = z.object({
  kamer_foto: base64ImageSchema,
  vloer_foto: optionalImageSchema,
  muur_foto: optionalImageSchema,
  tvwand_foto: optionalImageSchema,
  beschrijving: z.string().trim().max(2000).optional().nullable(),
  kamer_type: z.string().trim().min(1).max(60),
});

const KAMER_TYPE_EN: Record<string, string> = {
  woonkamer: "living room",
  slaapkamer: "bedroom",
  keuken: "kitchen",
  badkamer: "bathroom",
  werkkamer: "home office",
  eetkamer: "dining room",
};

const VLOER_SYSTEM =
  "Analyseer deze vloer of tegel foto. Beschrijf in het Engels: het exacte materiaal, de kleur (geef een hex kleurcode), het formaat, de textuur en het patroon. Max 50 woorden. Wees zeer specifiek.";

const MUUR_SYSTEM =
  "Analyseer deze muurkleur of verfstaal foto. Geef de exacte kleur in hex code en beschrijf de tint in het Engels. Max 20 woorden.";

const TVWAND_SYSTEM =
  "Analyseer deze tv wand of feature wall foto. Beschrijf in het Engels alle elementen: materialen, kleuren, verlichting, planken, panelen, afmetingen verhouding. Max 100 woorden. Wees zeer specifiek.";

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

function visionModel(): string {
  return process.env.OPENAI_VISION_MODEL ?? "gpt-4o";
}

function toDataUrl(image: string): string {
  return image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;
}

function imagePart(image: string): ChatCompletionContentPart {
  return { type: "image_url", image_url: { url: toDataUrl(image), detail: "low" } };
}

/** GPT-4o Vision analyse van één foto met een specifieke instructie. */
async function analyseFoto(openai: OpenAI, image: string, systemPrompt: string): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: visionModel(),
      temperature: 0.3,
      max_tokens: 280,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [{ type: "text", text: "Analyseer deze foto." }, imagePart(image)],
        },
      ],
    });
    return completion.choices?.[0]?.message?.content?.trim() ?? "";
  } catch (e) {
    console.warn("Planner foto-analyse overgeslagen:", (e as Error)?.message);
    return "";
  }
}

/** Bouwt de gecombineerde prompt uit alle analyses. */
function buildCombinedPrompt(params: {
  kamerType: string;
  vloerAnalyse: string;
  muurAnalyse: string;
  tvwandAnalyse: string;
  beschrijving: string;
}): string {
  const { kamerType, vloerAnalyse, muurAnalyse, tvwandAnalyse, beschrijving } = params;
  const en = KAMER_TYPE_EN[kamerType.toLowerCase()] ?? kamerType;

  const parts = [
    `Photorealistic interior design photo of a ${en}.`,
    "Keep the exact room structure, windows, doors, ceiling height and spatial layout identical to the original photo.",
    vloerAnalyse ? `Replace the floor with ${vloerAnalyse}.` : "",
    muurAnalyse ? `Paint all walls and ceiling in exactly ${muurAnalyse}.` : "",
    tvwandAnalyse ? `Replace the back feature wall with ${tvwandAnalyse}.` : "",
    beschrijving.trim() ? beschrijving.trim() : "",
    "The result should look like a real photograph, not a render.",
    "Professional interior photography, natural lighting, photorealistic, high quality, 8K.",
  ].filter((p) => p.length > 0);

  return parts.join(" ");
}

async function uploadToBucket(
  client: SupabaseClient,
  userId: string,
  folder: string,
  name: string,
  bytes: Buffer,
  contentType: string
): Promise<string> {
  const path = `${userId}/${folder}/${name}`;
  const { error } = await client.storage.from(BUCKET).upload(path, bytes, { contentType, upsert: true });
  if (error) throw error;
  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Geen publieke URL voor upload.");
  return data.publicUrl;
}

async function uploadKamerFoto(
  client: SupabaseClient,
  userId: string,
  folder: string,
  jpeg: Buffer
): Promise<string> {
  return uploadToBucket(client, userId, folder, "input.jpg", jpeg, "image/jpeg");
}

async function persistRender(
  client: SupabaseClient,
  userId: string,
  folder: string,
  name: string,
  sourceUrl: string
): Promise<string> {
  const fetched = await fetch(sourceUrl);
  if (!fetched.ok) throw new Error(`Kon render niet ophalen (${fetched.status}).`);
  const bytes = Buffer.from(await fetched.arrayBuffer());
  const contentType = fetched.headers.get("content-type") ?? "image/png";
  try {
    return await uploadToBucket(client, userId, folder, name, bytes, contentType);
  } catch (e) {
    console.warn("planner render upload faalde, val terug op data-URL:", (e as Error)?.message);
    return `data:${contentType};base64,${bytes.toString("base64")}`;
  }
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(
    `planner:visualiseer:${ip}`,
    RATE_LIMIT.plannerVisualiseer.limit,
    RATE_LIMIT.plannerVisualiseer.windowMs,
    { scope: "planner:visualiseer", clientIp: ip }
  );
  if (rl) return rl;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rawBody = await readJsonUnknown(req);
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }
  const {
    kamer_foto: kamerFoto,
    vloer_foto: vloerFoto,
    muur_foto: muurFoto,
    tvwand_foto: tvwandFoto,
    beschrijving,
    kamer_type: kamerType,
  } = parsed.data;

  try {
    const openai = getOpenAI();
    const folder = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const kamerBuffer = await processImageToBuffer(kamerFoto);
    const kamerFotoUrl = await uploadKamerFoto(auth.client, auth.userId, folder, kamerBuffer);

    // Stap 1: elke optionele foto apart analyseren (parallel).
    const [processedVloer, processedMuur, processedTvwand] = await Promise.all([
      vloerFoto ? processImage(vloerFoto) : Promise.resolve(null),
      muurFoto ? processImage(muurFoto) : Promise.resolve(null),
      tvwandFoto ? processImage(tvwandFoto) : Promise.resolve(null),
    ]);

    const [vloerAnalyse, muurAnalyse, tvwandAnalyse] = await Promise.all([
      processedVloer ? analyseFoto(openai, processedVloer, VLOER_SYSTEM) : Promise.resolve(""),
      processedMuur ? analyseFoto(openai, processedMuur, MUUR_SYSTEM) : Promise.resolve(""),
      processedTvwand ? analyseFoto(openai, processedTvwand, TVWAND_SYSTEM) : Promise.resolve(""),
    ]);

    // Stap 2: gecombineerde prompt.
    const prompt = buildCombinedPrompt({
      kamerType,
      vloerAnalyse,
      muurAnalyse,
      tvwandAnalyse,
      beschrijving: beschrijving?.trim() ?? "",
    });

    // Stap 4–6: ReimagineHome masker-analyse + beeldgeneratie, daarna opslaan in Storage.
    const generatedUrls = await runReimagineHomeRedesign({
      imageUrl: kamerFotoUrl,
      kamerType,
      prompt,
    });

    const persistJobs = generatedUrls.slice(0, 3).map(async (sourceUrl, index) => {
      const hoek = RENDER_HOEKEN[index] ?? `variant-${index + 1}`;
      const url = await persistRender(auth.client, auth.userId, folder, `render-${hoek}.png`, sourceUrl);
      return { url, hoek };
    });

    const renders = await Promise.all(persistJobs);

    return Response.json({ renders });
  } catch (e) {
    const error = e as { name?: string; message?: string; status?: number; statusCode?: number; code?: string };
    console.error("Planner visualiseer error", {
      name: error?.name,
      status: error?.status ?? error?.statusCode,
      code: error?.code,
      message: error?.message,
    });

    if (error?.message === "OPENAI_API_KEY is not set" || error?.message === "REIMAGINEHOME_API_KEY is not set") {
      return Response.json(
        { error: "De beeldgeneratie is nog niet geconfigureerd. Neem contact op met de beheerder." },
        { status: 503 }
      );
    }

    if (error instanceof ReimagineHomeError) {
      const status = error.statusCode === 504 ? 504 : error.statusCode && error.statusCode >= 400 ? error.statusCode : 502;
      return Response.json({ error: error.message }, { status });
    }

    return Response.json(
      { error: "Er is iets misgegaan bij het genereren. Probeer het opnieuw of gebruik een andere foto." },
      { status: 502 }
    );
  }
}
