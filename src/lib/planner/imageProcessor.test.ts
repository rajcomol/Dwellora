import { describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  cropRegionForMaxAspect,
  imageDimensionsFromBase64,
  isValidJpeg,
  MAX_DIMENSION,
  MIN_DIMENSION,
  processImage,
  processImageToBuffer,
} from "@/lib/planner/imageProcessor";

async function createJpegBase64(width: number, height: number): Promise<string> {
  const buf = await sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 80, b: 40 } },
  })
    .jpeg()
    .toBuffer();
  return buf.toString("base64");
}

describe("cropRegionForMaxAspect", () => {
  it("snijdt ultrabrede foto's bij naar 2:1", () => {
    const region = cropRegionForMaxAspect(1920, 400);
    expect(region.width).toBe(800);
    expect(region.height).toBe(400);
    expect(region.left).toBe(560);
  });
});

describe("processImage", () => {
  it("schaalt kleine afbeeldingen op naar minimaal 512px per kant", async () => {
    const input = await createJpegBase64(100, 100);
    const out = await processImage(input);
    const { width, height } = await imageDimensionsFromBase64(out);
    expect(width).toBeGreaterThanOrEqual(MIN_DIMENSION);
    expect(height).toBeGreaterThanOrEqual(MIN_DIMENSION);
  });

  it("schaalt lage landschapsfoto's op (720×480)", async () => {
    const input = await createJpegBase64(720, 480);
    const out = await processImage(input);
    const { width, height } = await imageDimensionsFromBase64(out);
    expect(width).toBeGreaterThanOrEqual(MIN_DIMENSION);
    expect(height).toBeGreaterThanOrEqual(MIN_DIMENSION);
  });

  it("verkleint grote afbeeldingen tot maximaal 1024×1024", async () => {
    const input = await createJpegBase64(2000, 1500);
    const out = await processImage(input);
    const { width, height } = await imageDimensionsFromBase64(out);
    expect(width).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(height).toBeLessThanOrEqual(MAX_DIMENSION);
  });

  it("snijdt extreme verhoudingen bij en houdt max 2:1 aan", async () => {
    const input = await createJpegBase64(1920, 400);
    const out = await processImage(input);
    const { width, height } = await imageDimensionsFromBase64(out);
    const ratio = Math.max(width / height, height / width);
    expect(ratio).toBeLessThanOrEqual(2.01);
    expect(width).toBeLessThanOrEqual(MAX_DIMENSION);
    expect(height).toBeLessThanOrEqual(MAX_DIMENSION);
  });

  it("geeft altijd geldige JPEG-bytes terug", async () => {
    const out = await processImageToBuffer("not-valid-base64!!!");
    expect(isValidJpeg(out)).toBe(true);
  });

  it("geeft altijd een geldige data-URL terug", async () => {
    const out = await processImage("not-valid-base64!!!");
    expect(out.startsWith("data:")).toBe(true);
  });
});
