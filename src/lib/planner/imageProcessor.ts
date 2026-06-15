import sharp from "sharp";

export const MIN_DIMENSION = 512;
export const MAX_DIMENSION = 1024;
export const MAX_ASPECT_RATIO = 2;

/** Zet kale base64 of data-URL om naar ruwe base64 + buffer. */
export function parseBase64(input: string): { raw: string; buffer: Buffer } {
  const raw = input.startsWith("data:") ? input.slice(input.indexOf(",") + 1) : input;
  try {
    return { raw, buffer: Buffer.from(raw, "base64") };
  } catch {
    return { raw, buffer: Buffer.alloc(0) };
  }
}

function toDataUrl(rawBase64: string, mime = "image/jpeg"): string {
  if (rawBase64.startsWith("data:")) return rawBase64;
  return `data:${mime};base64,${rawBase64}`;
}

/** JPEG magic bytes (FF D8 FF). */
export function isValidJpeg(buffer: Buffer): boolean {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

/** Centreert bijsnijden naar maximaal 2:1 (breedte : hoogte). */
export function cropRegionForMaxAspect(width: number, height: number): sharp.Region {
  if (width <= 0 || height <= 0) {
    return { left: 0, top: 0, width: Math.max(width, 1), height: Math.max(height, 1) };
  }
  if (width / height > MAX_ASPECT_RATIO) {
    const cropWidth = Math.round(height * MAX_ASPECT_RATIO);
    return { left: Math.max(0, Math.round((width - cropWidth) / 2)), top: 0, width: cropWidth, height };
  }
  if (height / width > MAX_ASPECT_RATIO) {
    const cropHeight = Math.round(width * MAX_ASPECT_RATIO);
    return {
      left: 0,
      top: Math.max(0, Math.round((height - cropHeight) / 2)),
      width,
      height: cropHeight,
    };
  }
  return { left: 0, top: 0, width, height };
}

/** Neutral fallback JPEG als sharp de input echt niet kan lezen. */
async function fallbackJpeg(): Promise<Buffer> {
  return sharp({
    create: { width: MIN_DIMENSION, height: MIN_DIMENSION, channels: 3, background: { r: 210, g: 205, b: 198 } },
  })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
}

/** Kernpipeline: buffer → genormaliseerde JPEG-bytes. */
async function pipelineToJpeg(input: Buffer): Promise<Buffer> {
  if (input.length < 16) return fallbackJpeg();

  let img = sharp(input, { failOn: "none" }).rotate();
  let meta = await img.metadata();
  let width = meta.width ?? 0;
  let height = meta.height ?? 0;
  if (width <= 0 || height <= 0) return fallbackJpeg();

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
    const scale = Math.max(MIN_DIMENSION / width, MIN_DIMENSION / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
    img = sharp(input, { failOn: "none" }).rotate().resize(width, height, { fit: "fill" });
  }

  const crop = cropRegionForMaxAspect(width, height);
  if (crop.width !== width || crop.height !== height) {
    width = crop.width;
    height = crop.height;
    img = img.extract(crop);
  }

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    img = img.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true });
  }

  const out = await img.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  return isValidJpeg(out) ? out : fallbackJpeg();
}

/**
 * Normaliseert een foto stilletjes voor AI-verwerking.
 * Geeft een data-URL (JPEG) terug.
 */
export async function processImage(base64: string): Promise<string> {
  const { raw, buffer } = parseBase64(base64);
  try {
    const out = await pipelineToJpeg(buffer);
    return toDataUrl(out.toString("base64"));
  } catch {
    return toDataUrl(raw);
  }
}

/** Zelfde normalisatie als processImage, als gegarandeerd geldige JPEG-bytes. */
export async function processImageToBuffer(base64: string): Promise<Buffer> {
  const { buffer } = parseBase64(base64);
  try {
    const out = await pipelineToJpeg(buffer);
    if (isValidJpeg(out)) return out;
  } catch {
    /* door naar fallback */
  }
  return fallbackJpeg();
}

/** Laadt een afbeelding uit een data-URL of publieke HTTP(S)-URL als genormaliseerde JPEG-bytes. */
export async function loadImageToBuffer(source: string): Promise<Buffer> {
  if (source.startsWith("http://") || source.startsWith("https://")) {
    const res = await fetch(source);
    if (!res.ok) throw new Error("Kon basisafbeelding niet laden.");
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    const b64 = Buffer.from(await res.arrayBuffer()).toString("base64");
    return processImageToBuffer(`data:${mime};base64,${b64}`);
  }
  return processImageToBuffer(source);
}

/** Hulp voor tests: leest afmetingen uit een base64/data-URL string. */
export async function imageDimensionsFromBase64(base64: string): Promise<{ width: number; height: number }> {
  const { buffer } = parseBase64(base64);
  const meta = await sharp(buffer).metadata();
  return { width: meta.width ?? 0, height: meta.height ?? 0 };
}

