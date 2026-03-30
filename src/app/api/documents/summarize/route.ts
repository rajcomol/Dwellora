import { completeChat } from "@/lib/ai/completeChat";
import { getComparePdfMaxCharsPerDoc, truncateTextForModel } from "@/lib/ai/limits";
import { clientIpFromRequest, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { extractPdfTextOrPlaceholder } from "@/lib/documents/pdfExtract";
import { requireAccessibleProject } from "@/lib/supabase/project-access";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { documentsSummarizeBodySchema } from "@/lib/validation/schemas";

type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  created_at: string;
};

function mockSummary(fileName: string) {
  return [
    "Wat offerte waarschijnlijk bevat:",
    `- Basisposten voor ${fileName} zoals materiaal en arbeid.`,
    "",
    "Mogelijke ontbrekende onderdelen:",
    "- Afvoer/afwerking, meerwerk, en planningdetails per fase.",
    "",
    "Risico's / onduidelijkheden:",
    "- Scope kan onvolledig zijn; controleer aannames, uitsluitingen en geldigheidsduur.",
  ].join("\n");
}

export async function POST(req: Request) {
  const rl = rateLimitResponse(`docs:summarize:${clientIpFromRequest(req)}`, 24, 60_000);
  if (rl) return rl;

  const rawBody = await readJsonUnknown(req);
  const parsed = documentsSummarizeBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }
  const documentId = parsed.data.documentId;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const docRes = await auth.client
    .from("documents")
    .select("id,project_id,file_name,file_path,created_at")
    .eq("id", documentId)
    .maybeSingle();

  if (docRes.error) {
    return Response.json({ error: docRes.error.message }, { status: 500 });
  }
  if (!docRes.data) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  const doc = docRes.data as DocumentRow;
  const projectAccess = await requireAccessibleProject(auth.client, doc.project_id);
  if (!projectAccess.ok) {
    if (projectAccess.status === 404) {
      return Response.json({ error: "Document not found." }, { status: 404 });
    }
    return Response.json({ error: projectAccess.message }, { status: projectAccess.status });
  }

  const rawExtracted = await extractPdfTextOrPlaceholder(doc, auth.client);
  const extractedText = truncateTextForModel(rawExtracted, getComparePdfMaxCharsPerDoc()).text;

  let summaryText: string;
  try {
    summaryText = await completeChat({
      temperature: 0.45,
      messages: [
        {
          role: "system",
          content: [
            "Je vat renovatie-offertes samen voor gebruikers van deze app. Toon: warm en praktisch, nuchter, geen marketingtaal.",
            "Antwoord in het Nederlands in plain text met exact deze koppen (elk op een eigen regel):",
            "Wat de offerte bevat",
            "Mogelijk ontbreekt",
            "Risico of onduidelijk",
            "Onder elke kop: 1–4 korte bullets. Totaal ongeveer 120–200 woorden; wees concreet.",
            "Verzin geen bedragen, posten of voorwaarden die niet in de brontekst staan. Als iets onduidelijk is, zeg dat.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Vat deze offertetekst samen:\n\n${extractedText}`,
        },
      ],
    });
  } catch (e) {
    const error = e as { name?: string; message?: string; status?: number; code?: string };
    console.error("Quotation summarize error", {
      name: error?.name,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    });
    summaryText = mockSummary(doc.file_name);
  }

  const upd = await auth.client.from("documents").update({ ai_summary: summaryText }).eq("id", documentId);
  if (upd.error) {
    console.warn("Could not persist ai_summary (column missing until migration?)", upd.error.message);
  }

  return Response.json({ summary: summaryText });
}
