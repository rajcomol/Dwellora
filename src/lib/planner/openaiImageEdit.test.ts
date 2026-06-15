import { afterEach, describe, expect, it } from "vitest";
import {
  buildEditPrompt,
  buildRefinePrompt,
  imageQuality,
  pickImageSize,
  supportsInputFidelityParam,
} from "@/lib/planner/openaiImageEdit";

describe("buildEditPrompt", () => {
  it("noemt basisfoto en referenties met gebruikersnotities", () => {
    const prompt = buildEditPrompt({
      references: [{ note: "houtkleur deur" }, { note: "tegelvloer" }],
      instruction: "Vervang de voordeur en vloer volgens de referenties",
    });

    expect(prompt).toContain("foto 1 (de huidige situatie)");
    expect(prompt).toContain("Behoud de architectuur, het perspectief en de belichting van foto 1");
    expect(prompt).toContain("foto 2: houtkleur deur");
    expect(prompt).toContain("foto 3: tegelvloer");
    expect(prompt).not.toContain("foto 4");
    expect(prompt).toContain("Vervang de voordeur en vloer volgens de referenties");
    expect(prompt).toContain("Lever een fotorealistisch resultaat");
    expect(prompt).not.toContain("Woonkamer");
  });

  it("gebruikt 'referentiebeeld' als notitie ontbreekt", () => {
    const prompt = buildEditPrompt({
      references: [{ note: "" }, {}],
      instruction: "Maak het geheel warmer",
    });

    expect(prompt).toContain("foto 2: referentiebeeld");
    expect(prompt).toContain("foto 3: referentiebeeld");
    expect(prompt).toContain("Maak het geheel warmer");
  });

  it("werkt zonder referenties en zonder instructie", () => {
    const prompt = buildEditPrompt({ references: [] });

    expect(prompt).toContain("foto 1 (de huidige situatie)");
    expect(prompt).not.toContain("foto 2");
    expect(prompt).toContain("Lever een fotorealistisch resultaat");
  });
});

describe("buildRefinePrompt", () => {
  it("vraagt alleen de gevraagde wijziging door te voeren", () => {
    const prompt = buildRefinePrompt("maak de muur warmer");

    expect(prompt).toContain("Behoud de architectuur");
    expect(prompt).toContain("Wijzig alleen wat gevraagd wordt: maak de muur warmer");
  });
});

describe("pickImageSize", () => {
  it("kiest landscape, portrait of vierkant", () => {
    expect(pickImageSize(1600, 900)).toBe("1536x1024");
    expect(pickImageSize(900, 1600)).toBe("1024x1536");
    expect(pickImageSize(1000, 1000)).toBe("1024x1024");
  });
});

describe("imageQuality", () => {
  const original = process.env.OPENAI_IMAGE_QUALITY;

  afterEach(() => {
    if (original === undefined) delete process.env.OPENAI_IMAGE_QUALITY;
    else process.env.OPENAI_IMAGE_QUALITY = original;
  });

  it("default is medium", () => {
    delete process.env.OPENAI_IMAGE_QUALITY;
    expect(imageQuality()).toBe("medium");
  });

  it("leest geldige env-waarden", () => {
    process.env.OPENAI_IMAGE_QUALITY = "high";
    expect(imageQuality()).toBe("high");
    process.env.OPENAI_IMAGE_QUALITY = "low";
    expect(imageQuality()).toBe("low");
  });

  it("valt terug op medium bij ongeldige waarde", () => {
    process.env.OPENAI_IMAGE_QUALITY = "ultra";
    expect(imageQuality()).toBe("medium");
  });
});

describe("supportsInputFidelityParam", () => {
  it("gpt-image-2 stuurt geen input_fidelity mee", () => {
    expect(supportsInputFidelityParam("gpt-image-2")).toBe(false);
  });

  it("gpt-image-1.5 ondersteunt input_fidelity", () => {
    expect(supportsInputFidelityParam("gpt-image-1.5")).toBe(true);
  });
});
