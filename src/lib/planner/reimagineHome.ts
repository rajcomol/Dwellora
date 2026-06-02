const API_BASE = "https://api.reimaginehome.ai";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 60_000;

/** REimagineHome space_type codes (interior). */
export const KAMER_TYPE_SPACE: Record<string, string> = {
  woonkamer: "ST-INT-011",
  slaapkamer: "ST-INT-003",
  keuken: "ST-INT-009",
  badkamer: "ST-INT-002",
  werkkamer: "ST-INT-016",
  eetkamer: "ST-INT-004",
};

/** Neutraal thema; de gedetailleerde stijl komt uit additional_prompt. */
const DEFAULT_DESIGN_THEME = "DT-INT-003";

type ApiEnvelope<T> = {
  status: "success" | "error";
  data?: T;
  error_message?: string;
};

type MaskEntry = {
  name: string;
  url: string;
  category?: string;
};

type CreateMaskResponse = { job_id: string };
type MaskJobResponse = { job_status: string; masks?: MaskEntry[] };
type GenerateImageResponse = { job_id: string };
type GenerateJobResponse = { job_status: string; generated_images?: string[] };

export class ReimagineHomeError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = "ReimagineHomeError";
  }
}

function getApiKey(): string {
  const key = process.env.REIMAGINEHOME_API_KEY?.trim();
  if (!key) {
    console.error("REIMAGINEHOME_API_KEY ontbreekt — configureer de sleutel in de omgevingsvariabelen.");
    throw new ReimagineHomeError("REIMAGINEHOME_API_KEY is not set");
  }
  return key;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapSpaceType(kamerType: string): string {
  return KAMER_TYPE_SPACE[kamerType.toLowerCase()] ?? "ST-INT-011";
}

function dutchApiError(message: string, status?: number): string {
  const lower = message.toLowerCase();
  if (status === 402 || lower.includes("payment") || lower.includes("credit")) {
    return "Het AI-tegoed is op. Vul je ReimagineHome-tegoed aan en probeer het later opnieuw.";
  }
  if (status === 429 || lower.includes("rate limit") || lower.includes("too many")) {
    return "Te veel aanvragen achter elkaar. Wacht even en probeer opnieuw.";
  }
  if (status === 401 || lower.includes("invalid api key") || lower.includes("authentication")) {
    return "De beeldgeneratie is nog niet geconfigureerd. Neem contact op met de beheerder.";
  }
  return message || "Er is iets misgegaan bij het genereren. Probeer het opnieuw of gebruik een andere foto.";
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
      ...(init?.headers ?? {}),
    },
  });

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await res.json()) as ApiEnvelope<T>;
  } catch {
    /* lege of niet-JSON body */
  }

  if (!res.ok || body?.status === "error") {
    const msg = body?.error_message ?? res.statusText ?? "Onbekende API-fout";
    console.error("ReimagineHome API-fout", { path, status: res.status, message: msg });
    throw new ReimagineHomeError(dutchApiError(msg, res.status), res.status);
  }

  if (!body?.data) {
    throw new ReimagineHomeError("Onverwacht antwoord van ReimagineHome.");
  }

  return body.data;
}

function isJobDone(status: string | undefined): boolean {
  return status?.toLowerCase() === "done";
}

function isJobFailed(status: string | undefined): boolean {
  const s = status?.toLowerCase();
  return s === "failed" || s === "error";
}

async function pollJob<T extends { job_status: string }>(
  path: string,
  isComplete: (data: T) => boolean,
  label: string
): Promise<T> {
  const deadline = Date.now() + MAX_POLL_MS;

  while (Date.now() < deadline) {
    const data = await apiRequest<T>(path, { method: "GET" });
    if (isComplete(data)) return data;

    if (isJobFailed(data.job_status)) {
      throw new ReimagineHomeError(`ReimagineHome ${label} is mislukt.`);
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new ReimagineHomeError(
    "De visualisatie duurt langer dan verwacht. Probeer het over een minuut opnieuw.",
    504
  );
}

async function createMask(imageUrl: string): Promise<MaskEntry[]> {
  const created = await apiRequest<CreateMaskResponse>("/v1/create_mask", {
    method: "POST",
    body: JSON.stringify({ image_url: imageUrl }),
  });

  const result = await pollJob<MaskJobResponse>(
    `/v1/create_mask/${created.job_id}`,
    (data) => isJobDone(data.job_status) && Array.isArray(data.masks) && data.masks.length > 0,
    "masker-analyse"
  );

  return result.masks ?? [];
}

async function generateImages(params: {
  imageUrl: string;
  maskUrls: string[];
  spaceType: string;
  prompt: string;
}): Promise<string[]> {
  const created = await apiRequest<GenerateImageResponse>("/v1/generate_image", {
    method: "POST",
    body: JSON.stringify({
      image_url: params.imageUrl,
      mask_urls: params.maskUrls,
      mask_category: "",
      space_type: params.spaceType,
      design_theme: DEFAULT_DESIGN_THEME,
      masking_element: "",
      color_preference: "",
      material_preference: "",
      landscaping_preference: "",
      generation_count: 3,
      additional_prompt: params.prompt,
    }),
  });

  const result = await pollJob<GenerateJobResponse>(
    `/v1/generate_image/${created.job_id}`,
    (data) =>
      isJobDone(data.job_status) &&
      Array.isArray(data.generated_images) &&
      data.generated_images.length > 0,
    "beeldgeneratie"
  );

  return result.generated_images ?? [];
}

/** Start masker-analyse en genereer 3 interieur-renders via ReimagineHome. */
export async function runReimagineHomeRedesign(params: {
  imageUrl: string;
  kamerType: string;
  prompt: string;
}): Promise<string[]> {
  const spaceType = mapSpaceType(params.kamerType);
  const masks = await createMask(params.imageUrl);
  const maskUrls = masks.map((m) => m.url).filter(Boolean);

  if (maskUrls.length === 0) {
    throw new ReimagineHomeError("Kon geen maskers voor de kamerfoto bepalen. Probeer een andere foto.");
  }

  return generateImages({
    imageUrl: params.imageUrl,
    maskUrls,
    spaceType,
    prompt: params.prompt,
  });
}
