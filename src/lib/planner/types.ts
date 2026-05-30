/** Gedeelde types voor de AI-kamervisualisatie (DALL-E 3 renders). */

export type RenderHoek = "overzicht" | "hoek" | "detail";

export type RenderImage = {
  url: string;
  /** Vaste hoek-sleutel voor de 3 renders, of vrije tekst. */
  hoek: RenderHoek | string;
};

/** Data die in kamer_planners.kamer_data wordt opgeslagen. */
export type VisualisatieData = {
  beschrijving: string;
  kamerType: string;
  stijlPreset: string | null;
  renders: RenderImage[];
  panorama: string | null;
};

export function emptyVisualisatieData(): VisualisatieData {
  return {
    beschrijving: "",
    kamerType: "Woonkamer",
    stijlPreset: null,
    renders: [],
    panorama: null,
  };
}

export const KAMER_TYPES = [
  "Woonkamer",
  "Slaapkamer",
  "Keuken",
  "Badkamer",
  "Werkkamer",
  "Eetkamer",
] as const;

export type KamerType = (typeof KAMER_TYPES)[number];

export type StijlPreset = {
  id: string;
  label: string;
  /** Basisbeschrijving die de textarea invult bij selectie. */
  beschrijving: string;
};

export const STIJL_PRESETS: StijlPreset[] = [
  {
    id: "scandinavisch",
    label: "Scandinavisch",
    beschrijving:
      "Lichte Scandinavische stijl met licht eiken vloer, witte muren, natuurlijke materialen, zachte textielen en veel natuurlijk licht. Minimalistisch en knus.",
  },
  {
    id: "modern",
    label: "Modern",
    beschrijving:
      "Strakke moderne stijl met neutrale kleuren, clean lijnen, statementverlichting en een mix van glas, metaal en hout.",
  },
  {
    id: "industrieel",
    label: "Industrieel",
    beschrijving:
      "Industriële stijl met betonlook, zichtbare bakstenen muur, zwart staal, leren meubels en Edison-verlichting.",
  },
  {
    id: "landelijk",
    label: "Landelijk",
    beschrijving:
      "Warme landelijke stijl met houten balken, zacht linnen, vintage accenten, aardetinten en een gezellige sfeer.",
  },
  {
    id: "japandi",
    label: "Japandi",
    beschrijving:
      "Japandi-stijl: rustige combinatie van Japans minimalisme en Scandinavische warmte, lage meubels, natuurlijke tinten en veel ruimte.",
  },
  {
    id: "klassiek",
    label: "Klassiek",
    beschrijving:
      "Klassieke, elegante stijl met sierlijst, rijke materialen, symmetrie, warme tinten en luxe stoffering.",
  },
];

export function presetById(id: string | null | undefined): StijlPreset | undefined {
  if (!id) return undefined;
  return STIJL_PRESETS.find((p) => p.id === id);
}
