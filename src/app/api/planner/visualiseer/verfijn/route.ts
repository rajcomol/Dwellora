import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { loadImageToBuffer } from "@/lib/planner/imageProcessor";
import { OpenAIImageError, refinePlannerImage } from "@/lib/planner/openaiImageEdit";
import { persistPlannerRender } from "@/lib/planner/renderStorage";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { z } from "zod";

export const maxDuration = 300;

const bodySchema = z.object({
  basis_foto: z.string().min(1).max(12_000_000),
  instructie: z.string().trim().min(1).max(500),
  folder: z.string().trim().min(1).max(120),
  version: z.number().int().min(2).max(20),
});

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(
    `planner:verfijn:${ip}`,
    RATE_LIMIT.plannerVerfijn.limit,
    RATE_LIMIT.plannerVerfijn.windowMs,
    { scope: "planner:verfijn", clientIp: ip }
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
  const { basis_foto: basisFoto, instructie, folder, version } = parsed.data;

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return Response.json(
      { error: "Beeldgeneratie niet geconfigureerd (API-sleutel ontbreekt)" },
      { status: 503 }
    );
  }

  try {
    const basisBuffer = await loadImageToBuffer(basisFoto);
    const outputBuffer = await refinePlannerImage({ basisBuffer, instruction: instructie });
    const url = await persistPlannerRender(
      auth.client,
      auth.userId,
      folder,
      `render-v${version}.png`,
      outputBuffer
    );

    return Response.json({ url, version });
  } catch (e) {
    if (e instanceof OpenAIImageError) {
      console.error("Planner verfijn error", {
        code: e.code,
        statusCode: e.statusCode,
        message: e.message,
      });
      return Response.json({ error: e.message }, { status: e.statusCode ?? 502 });
    }

    console.error("Planner verfijn error", {
      name: (e as Error)?.name,
      message: (e as Error)?.message,
    });

    return Response.json(
      { error: "Er is iets misgegaan bij het bijwerken. Probeer het opnieuw." },
      { status: 502 }
    );
  }
}
