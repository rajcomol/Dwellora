"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { defaultLocale, type Locale } from "./config";
import { createTranslator, type TranslateFn } from "./create-translator";
import { dictionaries } from "./dictionaries";

type I18nContextValue = {
  locale: Locale;
  t: TranslateFn;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale = defaultLocale,
}: {
  children: ReactNode;
  /** Later: afgeleid van cookie, route `[locale]`, of gebruikersprofiel. */
  locale?: Locale;
}) {
  const value = useMemo<I18nContextValue>(() => {
    const dict = dictionaries[locale] ?? dictionaries[defaultLocale];
    return { locale, t: createTranslator(dict) };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
