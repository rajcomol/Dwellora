import type { SupabaseClient } from "@supabase/supabase-js";

/** Truncate long PDF extracts before sending to the model (see `@/lib/ai/limits`). */
export { truncateTextForModel } from "@/lib/ai/limits";

export const DOCUMENTS_BUCKET = "documents";

/** Minimal row shape needed for download + placeholder (matches documents table columns). */
export type DocumentPdfRow = {
  id?: string;
  file_name: string;
  file_path: string;
};

export function placeholderExtractedText(doc: DocumentPdfRow): string {
  return [
    `Document: ${doc.file_name}`,
    `Path: ${doc.file_path}`,
    "Simulated extracted text:",
    "Quote includes labor, material, and installation line items for renovation works.",
    "No explicit demolition scope, permit costs, or contingency allocation were found.",
    "Payment terms mention milestone billing but do not clearly define delay penalties.",
  ].join("\n");
}

export async function extractPdfTextFromStorage(
  doc: DocumentPdfRow,
  supabase: SupabaseClient
): Promise<string> {
  const downloadRes = await supabase.storage.from(DOCUMENTS_BUCKET).download(doc.file_path);
  if (downloadRes.error || !downloadRes.data) {
    throw new Error(downloadRes.error?.message ?? "Failed to download PDF from storage.");
  }

  const arrayBuffer = await downloadRes.data.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const parsed = await parser.getText();
  await parser.destroy();

  const text = parsed.text?.trim() ?? "";
  if (!text) {
    throw new Error("PDF extraction returned empty text.");
  }

  return text;
}

/**
 * Tries real PDF text extraction; on failure logs and returns safe placeholder text per file.
 */
export async function extractPdfTextOrPlaceholder(
  doc: DocumentPdfRow,
  supabase: SupabaseClient
): Promise<string> {
  try {
    return await extractPdfTextFromStorage(doc, supabase);
  } catch (e) {
    const error = e as { name?: string; message?: string };
    console.error("PDF extraction failed, using placeholder text", {
      name: error?.name,
      message: error?.message,
      documentId: doc.id,
      filePath: doc.file_path,
    });
    return placeholderExtractedText(doc);
  }
}
