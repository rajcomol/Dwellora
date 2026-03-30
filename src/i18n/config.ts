/**
 * Internationalisatie: voeg een locale toe in `locales`, een JSON-bestand in `locales/`,
 * en registreer het in `dictionaries.ts`. Kies de actieve locale via cookie (`dwellora-locale`), gebruikersvoorkeur of route-segment.
 */
export const LOCALE_COOKIE_NAME = "dwellora-locale";

export const locales = ["nl"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "nl";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
