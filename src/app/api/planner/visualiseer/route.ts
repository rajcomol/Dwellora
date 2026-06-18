import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { checkPlannerDailyLimitOrRespond, recordPlannerGeneration } from "@/lib/planner/dailyLimit";
import { processImageToBuffer } from "@/lib/planner/imageProcessor";
import {
  OpenAIImageError,
  buildEditPrompt,
  generatePlannerImage,
  imageSizeFromBuffer,
} from "@/lib/planner/openaiImageEdit";
import { newRenderFolder, persistPlannerRender } from "@/lib/planner/renderStorage";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { z } from "zod";

export const maxDuration = 300;

const base64ImageSchema = z.string().min(1).max(12_000_000, "Afbeelding is te groot.");

const referenceSchema = z.object({
  foto: base64ImageSchema,
  notitie: z.string().trim().max(200).optional().nullable(),
});

const bodySchema = z.object({
  basisfoto: base64ImageSchema,
  referenties: z.array(referenceSchema).max(10).optional().default([]),
  beschrijving: z.string().trim().max(2000).optional().nullable(),
});

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
  const { basisfoto, referenties, beschrijving } = parsed.data;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return Response.json(
      { error: "Beeldgeneratie niet geconfigureerd (API-sleutel ontbreekt)" },
      { status: 503 }
    );
  }

  const dailyLimit = await checkPlannerDailyLimitOrRespond(auth.client, auth.userId);
  if (dailyLimit) return dailyLimit;

  try {
    const folder = newRenderFolder();

    const basisBuffer = await processImageToBuffer(basisfoto);
    const size = await imageSizeFromBuffer(basisBuffer);

    const referenceBuffers: Buffer[] = [];
    const referencePromptRefs: { note?: string | null }[] = [];

    for (const ref of referenties) {
      referenceBuffers.push(await processImageToBuffer(ref.foto));
      referencePromptRefs.push({ note: ref.notitie });
    }

    const prompt = buildEditPrompt({
      references: referencePromptRefs,
      instruction: beschrijving?.trim(),
    });

    const outputBuffer = await generatePlannerImage({
      kamerBuffer: basisBuffer,
      materialBuffers: referenceBuffers,
      prompt,
      size,
    });

    const url = await persistPlannerRender(auth.client, auth.userId, folder, "render-v1.png", outputBuffer);

    await recordPlannerGeneration(auth.client, auth.userId, "visualiseer");

    return Response.json({ url, folder, version: 1 });
  } catch (e) {
    if (e instanceof OpenAIImageError) {
      console.error("Planner visualiseer error", {
        code: e.code,
        statusCode: e.statusCode,
        message: e.message,
      });
      return Response.json({ error: e.message }, { status: e.statusCode ?? 502 });
    }

    console.error("Planner visualiseer error", {
      name: (e as Error)?.name,
      message: (e as Error)?.message,
    });

    return Response.json(
      { error: "Er is iets misgegaan bij het genereren. Probeer het opnieuw of gebruik een andere foto." },
      { status: 502 }
    );
  }
}
