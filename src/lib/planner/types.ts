/** Gedeelde types voor de AI-kamervisualisatie (interior-design renders). */

/** @deprecated Legacy variant-sleutel; alleen voor migratie van oude opgeslagen data. */
export type RenderHoek = "structuur" | "gebalanceerd" | "maximaal";

/** @deprecated Legacy render; alleen voor migratie van oude opgeslagen data. */
export type RenderImage = {
  url: string;
  hoek: RenderHoek | string;
};

export type RenderVersion = {
  url: string;
  /** Weergavenaam, bijv. v1, v2. */
  label: string;
  /** Instructie bij bijsturing; null voor de eerste generatie. */
  instruction?: string | null;
};

/** Metadata van referentiefoto's (zonder afbeeldingsdata) voor opslag. */
export type ReferencePhotoMeta = {
  name: string;
  notitie: string;
};

/** Data die in kamer_planners.kamer_data wordt opgeslagen. */
export type VisualisatieData = {
  /** Hoofdinstructie: wat de gebruiker wil veranderen. */
  beschrijving: string;
  /** Notities bij referentiefoto's (afbeeldingen zelf niet opgeslagen). */
  referentieNotities?: ReferencePhotoMeta[];
  versions: RenderVersion[];
  activeVersionIndex: number;
  /** Supabase-map voor alle versies van deze sessie. */
  renderFolder?: string | null;
};

export function emptyVisualisatieData(): VisualisatieData {
  return {
    beschrijving: "",
    referentieNotities: [],
    versions: [],
    activeVersionIndex: 0,
    renderFolder: null,
  };
}

type LegacyVisualisatieData = Partial<VisualisatieData> & {
  renders?: RenderImage[];
  /** @deprecated */
  kamerType?: string;
};

/** Normaliseert opgeslagen data (inclusief legacy renders-array) naar het versie-model. */
export function normalizeVisualisatieData(raw: LegacyVisualisatieData): VisualisatieData {
  if (Array.isArray(raw.versions) && raw.versions.length > 0) {
    return {
      beschrijving: raw.beschrijving ?? "",
      referentieNotities: raw.referentieNotities ?? [],
      versions: raw.versions,
      activeVersionIndex: raw.activeVersionIndex ?? 0,
      renderFolder: raw.renderFolder ?? null,
    };
  }

  if (Array.isArray(raw.renders) && raw.renders.length > 0) {
    return {
      beschrijving: raw.beschrijving ?? "",
      referentieNotities: raw.referentieNotities ?? [],
      versions: raw.renders.map((render, index) => ({
        url: render.url,
        label: `v${index + 1}`,
        instruction: null,
      })),
      activeVersionIndex: 0,
      renderFolder: raw.renderFolder ?? null,
    };
  }

  return emptyVisualisatieData();
}
