/** Gedeelde types voor de AI-kamervisualisatie (interior-design renders). */

export type RenderHoek = "structuur" | "gebalanceerd" | "maximaal";

export type RenderImage = {
  url: string;
  /** Variant-sleutel voor de 3 renders. */
  hoek: RenderHoek | string;
};

/** Data die in kamer_planners.kamer_data wordt opgeslagen. */
export type VisualisatieData = {
  /** Optionele extra wensen die de gebruiker bij de render meegeeft. */
  beschrijving: string;
  kamerType: string;
  renders: RenderImage[];
};

export function emptyVisualisatieData(): VisualisatieData {
  return {
    beschrijving: "",
    kamerType: "Woonkamer",
    renders: [],
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
