import { completeChat } from "@/lib/ai/completeChat";
import { clientIpFromRequest, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { extractPdfTextOrPlaceholder } from "@/lib/documents/pdfExtract";
import { isUuid, requireAccessibleProject } from "@/lib/supabase/project-access";

type SummarizeRequest = {
  documentId?: unknown;
};

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

  let body: SummarizeRequest | null = null;
  try {
    body = (await req.json()) as SummarizeRequest;
  } catch {
    // ignore
  }

  const docIdRaw = body?.documentId;
  const documentId = typeof docIdRaw === "string" ? docIdRaw.trim() : "";
  if (!documentId) {
    return Response.json({ error: "documentId is required." }, { status: 400 });
  }
  if (!isUuid(documentId)) {
    return Response.json({ error: "Invalid documentId." }, { status: 400 });
  }

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

  const extractedText = await extractPdfTextOrPlaceholder(doc, auth.client);

  let summaryText: string;
  try {
    summaryText = await completeChat({
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You summarize renovation quotations. Keep concise (max 120 words). Return plain text with exactly these headings in Dutch: 'Wat offerte bevat', 'Mogelijk ontbreekt', 'Risico of onduidelijk'. Under each heading, use 1-3 bullet points.",
        },
        {
          role: "user",
          content: `Summarize this quotation text:\n\n${extractedText}`,
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
