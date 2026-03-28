import type { Locale } from "./config";
import nl from "./locales/nl.json";

/** Per-locale berichten. Voeg een import + key toe voor een nieuwe taal. */
export const dictionaries: Record<Locale, typeof nl> = {
  nl,
};
