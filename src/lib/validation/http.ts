import type { ZodError } from "zod";
import { zodErrorMessage } from "@/lib/validation/zodErrors";

export async function readJsonUnknown(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}

export function jsonValidationError(error: ZodError): Response {
  return Response.json({ error: zodErrorMessage(error) }, { status: 400 });
}
