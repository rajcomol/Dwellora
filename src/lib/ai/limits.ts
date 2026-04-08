/**
 * Central defaults and helpers for AI token/cost guardrails.
 * Override via env in deployment (see `.env.example`).
 */

const DEFAULT_CHAT_MAX_OUTPUT_TOKENS = 1200;
const DEFAULT_COMPARE_MAX_OUTPUT_TOKENS = 2800;
const DEFAULT_PROJECT_CONTEXT_MAX_CHARS = 32_000;
/** Per PDF fragment passed to compare (each document). */
const DEFAULT_COMPARE_PDF_MAX_CHARS_PER_DOC = 24_000;
/** Raised default: expanded kennisbank; override with OPENAI_HELP_KB_MAX_CHARS if needed. */
const DEFAULT_HELP_KB_MAX_CHARS = 28_000;

/** Max tasks listed per room in chat project context (avoids huge dumps). */
export const CHAT_CONTEXT_MAX_TASKS_PER_ROOM = 20;

function parsePositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Max completion tokens for chat (`completeChat`). Env: `OPENAI_MAX_OUTPUT_TOKENS`. */
export function getChatMaxOutputTokens(): number {
  return parsePositiveIntEnv("OPENAI_MAX_OUTPUT_TOKENS", DEFAULT_CHAT_MAX_OUTPUT_TOKENS);
}

/** Max completion tokens for offertevergelijking. Env: `OPENAI_MAX_COMPARE_OUTPUT_TOKENS`. */
export function getCompareMaxOutputTokens(): number {
  return parsePositiveIntEnv("OPENAI_MAX_COMPARE_OUTPUT_TOKENS", DEFAULT_COMPARE_MAX_OUTPUT_TOKENS);
}

/** Hard cap on project context string length for chat. Env: `OPENAI_PROJECT_CONTEXT_MAX_CHARS`. */
export function getProjectContextMaxChars(): number {
  return parsePositiveIntEnv("OPENAI_PROJECT_CONTEXT_MAX_CHARS", DEFAULT_PROJECT_CONTEXT_MAX_CHARS);
}

/** Truncate each offerte’s text before compare API. Env: `OPENAI_COMPARE_PDF_MAX_CHARS_PER_DOC`. */
export function getComparePdfMaxCharsPerDoc(): number {
  return parsePositiveIntEnv("OPENAI_COMPARE_PDF_MAX_CHARS_PER_DOC", DEFAULT_COMPARE_PDF_MAX_CHARS_PER_DOC);
}

/** Max length of serialized help KB for `/api/chat`. Env: `OPENAI_HELP_KB_MAX_CHARS`. */
export function getHelpKbMaxChars(): number {
  return parsePositiveIntEnv("OPENAI_HELP_KB_MAX_CHARS", DEFAULT_HELP_KB_MAX_CHARS);
}

export type TruncateResult = { text: string; truncated: boolean };

/**
 * Keeps the start of the string (model sees project header + early content).
 * If truncated, caller should mention this in the prompt to the model.
 */
export function truncateTextForModel(text: string, maxChars: number): TruncateResult {
  if (maxChars <= 0) return { text: "", truncated: text.length > 0 };
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: `${text.slice(0, maxChars)}\n\n[… Fragment ingekort tot ${maxChars} tekens; analyse op dit deel.]`,
    truncated: true,
  };
}
