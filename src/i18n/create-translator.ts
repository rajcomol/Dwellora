export function getMessage(dict: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur !== null && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return path;
    }
  }
  return typeof cur === "string" ? cur : path;
}

export function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    params[key] !== undefined && params[key] !== null ? String(params[key]) : ""
  );
}

export type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function createTranslator(dict: unknown): TranslateFn {
  return function t(key: string, params?: Record<string, string | number>): string {
    return interpolate(getMessage(dict, key), params);
  };
}
