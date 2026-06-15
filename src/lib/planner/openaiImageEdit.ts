import sharp from "sharp";

export type ImageEditSize = "1024x1024" | "1536x1024" | "1024x1536";
export type ImageEditQuality = "high" | "medium" | "low";

export type ReferencePromptRef = {
  /** Vrije notitie van de gebruiker; valt terug op 'referentiebeeld'. */
  note?: string | null;
};

/** @deprecated Gebruik ReferencePromptRef */
export type MaterialPromptRef = ReferencePromptRef & { label?: string };

export class OpenAIImageError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "OpenAIImageError";
  }
}

const EDIT_ENDPOINT = "https://api.openai.com/v1/images/edits";

export function imageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2";
}

const VALID_QUALITIES: ImageEditQuality[] = ["low", "medium", "high"];

/** Output-kwaliteit (low/medium/high); default medium voor snellere generatie. */
export function imageQuality(): ImageEditQuality {
  const raw = process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase();
  if (raw && VALID_QUALITIES.includes(raw as ImageEditQuality)) {
    return raw as ImageEditQuality;
  }
  return "medium";
}

/** gpt-image-2 verwerkt inputs automatisch op hoge fidelity; oudere modellen vereisen expliciet high. */
export function supportsInputFidelityParam(model: string): boolean {
  return !model.startsWith("gpt-image-2");
}

/** Bepaalt outputformaat passend bij de oriëntatie van de basisfoto. */
export function pickImageSize(width: number, height: number): ImageEditSize {
  if (width <= 0 || height <= 0) return "1024x1024";
  const ratio = width / height;
  if (ratio > 1.15) return "1536x1024";
  if (ratio < 0.87) return "1024x1536";
  return "1024x1024";
}

export async function imageSizeFromBuffer(buffer: Buffer): Promise<ImageEditSize> {
  const meta = await sharp(buffer).metadata();
  return pickImageSize(meta.width ?? 0, meta.height ?? 0);
}

const DEFAULT_REFERENCE_LABEL = "referentiebeeld";

/** Bouwt de bewerkingsprompt met basisfoto, referenties en hoofdinstructie (structuurbehoud). */
export function buildEditPrompt(params: {
  references: ReferencePromptRef[];
  instruction?: string;
}): string {
  const { references, instruction } = params;

  let prompt =
    "Bewerk foto 1 (de huidige situatie). Behoud de architectuur, het perspectief en de belichting van foto 1.";

  if (references.length > 0) {
    const refs = references
      .map((reference, index) => {
        const note = reference.note?.trim() || DEFAULT_REFERENCE_LABEL;
        return `foto ${index + 2}: ${note}`;
      })
      .join(". ");
    prompt += ` ${refs}.`;
  }

  const mainInstruction = instruction?.trim();
  if (mainInstruction) {
    prompt += ` ${mainInstruction}.`;
  }

  prompt += " Lever een fotorealistisch resultaat.";

  return prompt;
}

/** Prompt voor bijsturing op een bestaand render: wijzig alleen wat gevraagd wordt. */
export function buildRefinePrompt(instruction: string): string {
  const text = instruction.trim();
  return `Bewerk deze foto. Behoud de architectuur, het perspectief en de lichtval exact zoals in het origineel. Wijzig alleen wat gevraagd wordt: ${text}. Lever een fotorealistisch resultaat alsof het een echte foto van de verbouwde situatie is.`;
}

function requireApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new OpenAIImageError(
      "Beeldgeneratie niet geconfigureerd (API-sleutel ontbreekt)",
      "OPENAI_API_KEY_MISSING",
      503
    );
  }
  return apiKey;
}

function mapOpenAIError(body: unknown, status: number): OpenAIImageError {
  const err = body as { error?: { message?: string; type?: string; code?: string } } | null;
  const detail = err?.error?.message ?? "Onbekende OpenAI-fout";
  console.error("OpenAI images/edits API-fout", { status, type: err?.error?.type, code: err?.error?.code, detail });

  if (status === 401 || status === 403) {
    return new OpenAIImageError(
      "Beeldgeneratie niet geconfigureerd (API-sleutel ongeldig)",
      "OPENAI_AUTH",
      503
    );
  }
  if (status === 429) {
    return new OpenAIImageError("Te veel aanvragen. Wacht even en probeer opnieuw.", "OPENAI_RATE_LIMIT", 429);
  }
  if (status === 400) {
    return new OpenAIImageError(
      "De foto's konden niet worden verwerkt. Probeer andere afbeeldingen of een kleinere upload.",
      "OPENAI_BAD_REQUEST",
      400
    );
  }

  return new OpenAIImageError(
    "Er is iets misgegaan bij het genereren. Probeer het opnieuw of gebruik een andere foto.",
    "OPENAI_API",
    status >= 500 ? 502 : status
  );
}

function decodeResponseImages(body: unknown): Buffer[] {
  const data = (body as { data?: { b64_json?: string }[] } | null)?.data;
  if (!Array.isArray(data) || data.length === 0) {
    throw new OpenAIImageError("OpenAI gaf geen afbeeldingen terug.", "OPENAI_EMPTY");
  }

  return data.map((item, index) => {
    if (!item?.b64_json) {
      throw new OpenAIImageError(`OpenAI-antwoord mist afbeeldingsdata (beeld ${index + 1}).`, "OPENAI_EMPTY");
    }
    return Buffer.from(item.b64_json, "base64");
  });
}

async function requestImageEdit(params: {
  apiKey: string;
  model: string;
  images: Buffer[];
  prompt: string;
  size: ImageEditSize;
  n: number;
  quality?: ImageEditQuality;
}): Promise<Buffer[]> {
  const form = new FormData();
  form.append("model", params.model);
  form.append("prompt", params.prompt);
  form.append("quality", params.quality ?? imageQuality());
  form.append("size", params.size);
  form.append("n", String(params.n));

  if (supportsInputFidelityParam(params.model)) {
    form.append("input_fidelity", "high");
  }

  params.images.forEach((buffer, index) => {
    form.append("image[]", new Blob([Uint8Array.from(buffer)], { type: "image/jpeg" }), `image-${index + 1}.jpg`);
  });

  const res = await fetch(EDIT_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}` },
    body: form,
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* lege of niet-JSON body */
  }

  if (!res.ok) {
    throw mapOpenAIError(body, res.status);
  }

  return decodeResponseImages(body);
}

/** Genereert één render via OpenAI GPT Image edits (structuurbehoud, configureerbare kwaliteit). */
export async function generatePlannerImage(params: {
  kamerBuffer: Buffer;
  materialBuffers: Buffer[];
  prompt: string;
  size: ImageEditSize;
}): Promise<Buffer> {
  const apiKey = requireApiKey();
  const model = imageModel();
  const images = [params.kamerBuffer, ...params.materialBuffers];

  const [buffer] = await requestImageEdit({
    apiKey,
    model,
    images,
    prompt: params.prompt,
    size: params.size,
    n: 1,
  });

  return buffer;
}

/** Verfijnt een bestaand render op basis van een instructie (input-fidelity hoog waar ondersteund). */
export async function refinePlannerImage(params: {
  basisBuffer: Buffer;
  instruction: string;
}): Promise<Buffer> {
  const apiKey = requireApiKey();
  const model = imageModel();
  const size = await imageSizeFromBuffer(params.basisBuffer);
  const prompt = buildRefinePrompt(params.instruction);

  const [buffer] = await requestImageEdit({
    apiKey,
    model,
    images: [params.basisBuffer],
    prompt,
    size,
    n: 1,
  });

  return buffer;
}
