import OpenAI from "openai";
import type { ChatCompletionContentPart } from "openai/resources/chat/completions";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { presetById, type RenderHoek } from "@/lib/planner/types";
import { z } from "zod";

export const maxDuration = 300;

const BUCKET = "planner-renders";
const MAX_PHOTOS = 4;

const base64ImageSchema = z.string().min(1).max(12_000_000, "Afbeelding is te groot.");

const bodySchema = z.object({
  beschrijving: z.string().trim().min(3, "Geef een beschrijving op.").max(2000),
  kamer_type: z.string().trim().min(1).max(60),
  stijl_preset: z.string().trim().max(60).optional().nullable(),
  huidige_kamer_fotos: z.array(base64ImageSchema).max(MAX_PHOTOS).optional(),
  inspiratie_fotos: z.array(base64ImageSchema).max(MAX_PHOTOS).optional(),
});

const KAMER_TYPE_EN: Record<string, string> = {
  woonkamer: "living room",
  slaapkamer: "bedroom",
  keuken: "kitchen",
  badkamer: "bathroom",
  werkkamer: "home office",
  eetkamer: "dining room",
};

const RENDER_HOEKEN: { hoek: RenderHoek; angle: string }[] = [
  { hoek: "overzicht", angle: "wide angle view from entrance" },
  { hoek: "hoek", angle: "corner perspective showing two walls" },
  { hoek: "detail", angle: "detail view of main focal point" },
];

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey });
}

function visionModel(): string {
  return process.env.OPENAI_VISION_MODEL ?? "gpt-4o";
}

function imageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL ?? "dall-e-3";
}

function toDataUrl(image: string): string {
  return image.startsWith("data:") ? image : `data:image/png;base64,${image}`;
}

function imageParts(images: string[]): ChatCompletionContentPart[] {
  return images.map((img) => ({ type: "image_url", image_url: { url: toDataUrl(img), detail: "low" } }));
}

/** Stap 1: korte technische context uit kamerfoto's via GPT-4o Vision. */
async function describePhotos(openai: OpenAI, system: string, images: string[]): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: visionModel(),
    temperature: 0.3,
    max_tokens: 300,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [{ type: "text", text: "Beschrijf kort op basis van deze foto's." }, ...imageParts(images)],
      },
    ],
  });
  return completion.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Stap 2: rijke DALL-E 3 prompt. */
function buildPrompt(params: {
  kamerType: string;
  beschrijving: string;
  stijlContext: string;
  kamerContext: string;
  inspiratieContext: string;
  angle: string;
}): string {
  const { kamerType, beschrijving, stijlContext, kamerContext, inspiratieContext, angle } = params;
  const en = KAMER_TYPE_EN[kamerType.toLowerCase()] ?? kamerType;
  const parts = [
    `Photorealistic interior design render of a ${en}`,
    beschrijving,
    stijlContext,
    inspiratieContext,
    kamerContext,
    angle,
    "professional architectural photography, soft natural lighting, high detail, 8K quality, interior design magazine style",
  ].filter((p) => p && p.trim().length > 0);
  // DALL-E 3 promptlimiet is 4000 tekens.
  return parts.join(", ").slice(0, 3900);
}

async function generateImageB64(openai: OpenAI, prompt: string, size: "1024x1024" | "1792x1024"): Promise<string> {
  const res = await openai.images.generate({
    model: imageModel(),
    prompt,
    n: 1,
    size,
    response_format: "b64_json",
  });
  const b64 = res.data?.[0]?.b64_json;
  if (!b64) throw new Error("Geen afbeelding ontvangen van het model.");
  return b64;
}

/** Upload base64 PNG naar Storage; valt terug op data-URL als upload faalt. */
async function persistImage(
  client: SupabaseClient,
  userId: string,
  folder: string,
  name: string,
  b64: string
): Promise<string> {
  try {
    const bytes = Buffer.from(b64, "base64");
    const path = `${userId}/${folder}/${name}.png`;
    const { error } = await client.storage.from(BUCKET).upload(path, bytes, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) throw error;
    const { data } = client.storage.from(BUCKET).getPublicUrl(path);
    if (data?.publicUrl) return data.publicUrl;
  } catch (e) {
    console.warn("planner render upload faalde, val terug op data-URL:", (e as Error)?.message);
  }
  return `data:image/png;base64,${b64}`;
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
    beschrijving,
    kamer_type: kamerType,
    stijl_preset: stijlPreset,
    huidige_kamer_fotos = [],
    inspiratie_fotos = [],
  } = parsed.data;

  try {
    const openai = getOpenAI();

    // Stap 1: foto-context (optioneel)
    let kamerContext = "";
    let inspiratieContext = "";
    const visionJobs: Promise<void>[] = [];
    if (huidige_kamer_fotos.length > 0) {
      visionJobs.push(
        describePhotos(
          openai,
          "Analyseer deze kamer foto's en geef een korte technische beschrijving van de ruimte: afmetingen, lichtinval, architecturale kenmerken, bestaande elementen die behouden kunnen worden. Max 100 woorden.",
          huidige_kamer_fotos
        ).then((txt) => {
          if (txt) kamerContext = `existing room context: ${txt}`;
        })
      );
    }
    if (inspiratie_fotos.length > 0) {
      visionJobs.push(
        describePhotos(
          openai,
          "Beschrijf in max 50 woorden de stijl, kleuren, materialen en sfeer van deze inspiratiefoto's, te gebruiken als stijlreferentie voor een nieuw interieurontwerp.",
          inspiratie_fotos
        ).then((txt) => {
          if (txt) inspiratieContext = `style reference: ${txt}`;
        })
      );
    }
    if (visionJobs.length > 0) await Promise.all(visionJobs);

    const preset = presetById(stijlPreset);
    const stijlContext = preset ? `in ${preset.label} style` : "";

    // Stap 3 + 4: 3 renders + 360° panorama parallel genereren en opslaan.
    const folder = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const renderJobs = RENDER_HOEKEN.map(async ({ hoek, angle }) => {
      const prompt = buildPrompt({ kamerType, beschrijving, stijlContext, kamerContext, inspiratieContext, angle });
      const b64 = await generateImageB64(openai, prompt, "1024x1024");
      const url = await persistImage(auth.client, auth.userId, folder, `render-${hoek}`, b64);
      return { url, hoek };
    });

    const panoramaJob = (async () => {
      const prompt = buildPrompt({
        kamerType,
        beschrijving,
        stijlContext,
        kamerContext,
        inspiratieContext,
        angle: "equirectangular 360 degree panorama, seamless wraparound view",
      });
      const b64 = await generateImageB64(openai, prompt, "1792x1024");
      return persistImage(auth.client, auth.userId, folder, "panorama", b64);
    })();

    const [renders, panorama] = await Promise.all([Promise.all(renderJobs), panoramaJob]);

    return Response.json({ renders, panorama });
  } catch (e) {
    const error = e as { name?: string; message?: string; status?: number; code?: string };
    console.error("Planner visualiseer error", {
      name: error?.name,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    });
    const status = error?.message === "OPENAI_API_KEY is not set" ? 503 : 502;
    return Response.json({ error: "Visualisatie mislukt. Probeer het later opnieuw." }, { status });
  }
}
