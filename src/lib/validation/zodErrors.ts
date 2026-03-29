import type { ZodError } from "zod";

/** First issue message for API JSON error responses. */
export function zodErrorMessage(error: ZodError): string {
  const first = error.issues[0];
  return first?.message ?? "Invalid input.";
}
