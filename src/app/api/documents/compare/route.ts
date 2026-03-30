import OpenAI from "openai";
import { clientIpFromRequest, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { getCompareMaxOutputTokens, getComparePdfMaxCharsPerDoc, truncateTextForModel } from "@/lib/ai/limits";
import { extractPdfTextOrPlaceholder } from "@/lib/documents/pdfExtract";
import { requireAccessibleProject } from "@/lib/supabase/project-access";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { documentsCompareBodySchema } from "@/lib/validation/schemas";

type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  created_at: string;
};

function mockComparison(nameA: string, nameB: string) {
  return [
    "Scope in offerte A",
    `- Algemene renovatieposten voor ${nameA} (details niet beschikbaar in fallback).`,
    "",
    "Scope in offerte B",
    `- Algemene renovatieposten voor ${nameB} (details niet beschikbaar in fallback).`,
    "",
    "Waarschijnlijk ontbrekende onderdelen",
    "- Vergelijk expliciet: meerwerk, afvoer, vergunningen, planning en garanties.",
    "",
    "Prijs- of scopeverschillen (indien genoemd)",
    "- Geen betrouwbare tekstextractie; vraag schriftelijke specificaties na.",
    "",
    "Risico's / onduidelijke formuleringen",
    "- Controleer uitsluitingen, indexatie en betalingsvoorwaarden in beide offertes.",
    "",
    "Vragen voor de aannemer",
    "- Welke posten zijn inbegrepen vs. meerwerk?",
    "- Wat is de planning en wie levert materialen?",
  ].join("\n");
}

const COMPARISON_SYSTEM_PROMPT = [
  "Je vergelijkt twee renovatie-offertes op basis van de meegeleverde tekstfragmenten.",
  "Gebruik plain text met de volgende sectiekoppen (elk op een eigen regel, daarna de inhoud):",
  "Scope in offerte A",
  "Scope in offerte B",
  "Sterke punten offerte A",
  "Sterke punten offerte B",
  "Waar welke offerte beter lijkt te passen",
  "Waarschijnlijk ontbrekende onderdelen",
  "Prijs- of scopeverschillen (indien genoemd)",
  "Risico's / onduidelijke formuleringen",
  "Als je nog twijfelt — vergelijkingsvragen",
  "Vragen voor de aannemer",
  "Wees grondig en concreet: trek citaten of parafraas wat er echt in de tekst staat. Richtlijn lengte: ongeveer 500–800 woorden wanneer de bron dat toelaat; liever inhoudelijk dan oppervlakkig.",
  "Prijzen en bedragen: nooit verzinnen. Als er geen prijzen in de tekst staan, zeg dat expliciet.",
  "Bij ‘Waar welke offerte beter lijkt te passen’: denk in termen van snelheid, scope, prijs-kwaliteit, garanties, planning — alleen als de documenten dat toelaten. Voeg een korte disclaimer toe: geen juridisch advies; jouw oordeel is ondersteuning bij lezen, geen vervanging van eigen controle of een second opinion.",
  "Onder elke kop: bullets of korte alinea’s, wat het leesbaarst is.",
].join("\n");

export async function POST(req: Request) {
  const rl = rateLimitResponse(`docs:compare:${clientIpFromRequest(req)}`, 16, 60_000);
  if (rl) return rl;

  const rawBody = await readJsonUnknown(req);
  const parsed = documentsCompareBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonValidationError(parsed.error);
  }
  const idA = parsed.data.documentIdA;
  const idB = parsed.data.documentIdB;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [resA, resB] = await Promise.all([
    auth.client
      .from("documents")
      .select("id,project_id,file_name,file_path,created_at")
      .eq("id", idA)
      .maybeSingle(),
    auth.client
      .from("documents")
      .select("id,project_id,file_name,file_path,created_at")
      .eq("id", idB)
      .maybeSingle(),
  ]);

  if (resA.error) return Response.json({ error: resA.error.message }, { status: 500 });
  if (resB.error) return Response.json({ error: resB.error.message }, { status: 500 });
  if (!resA.data) return Response.json({ error: "Document A not found." }, { status: 404 });
  if (!resB.data) return Response.json({ error: "Document B not found." }, { status: 404 });

  const docA = resA.data as DocumentRow;
  const docB = resB.data as DocumentRow;

  if (docA.project_id !== docB.project_id) {
    return Response.json(
      { error: "Both documents must belong to the same project." },
      { status: 400 }
    );
  }

  const projectAccess = await requireAccessibleProject(auth.client, docA.project_id);
  if (!projectAccess.ok) {
    if (projectAccess.status === 404) {
      return Response.json({ error: "Documents not found." }, { status: 404 });
    }
    return Response.json({ error: projectAccess.message }, { status: projectAccess.status });
  }

  const [rawA, rawB] = await Promise.all([
    extractPdfTextOrPlaceholder(docA, auth.client),
    extractPdfTextOrPlaceholder(docB, auth.client),
  ]);
  const maxPdfChars = getComparePdfMaxCharsPerDoc();
  const textA = truncateTextForModel(rawA, maxPdfChars).text;
  const textB = truncateTextForModel(rawB, maxPdfChars).text;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ comparison: mockComparison(docA.file_name, docB.file_name) });
  }

  const openai = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const userContent = [
    `Offerte A (${docA.file_name}, id ${docA.id}):`,
    textA,
    "",
    `Offerte B (${docB.file_name}, id ${docB.id}):`,
    textB,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model,
      temperature: 0.55,
      max_tokens: getCompareMaxOutputTokens(),
      messages: [
        { role: "system", content: COMPARISON_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const comparison = completion.choices?.[0]?.message?.content?.trim();
    return Response.json({
      comparison: comparison || mockComparison(docA.file_name, docB.file_name),
    });
  } catch (e) {
    const error = e as { name?: string; message?: string; status?: number; code?: string };
    console.error("Quotation compare error", {
      name: error?.name,
      status: error?.status,
      code: error?.code,
      message: error?.message,
    });
    return Response.json({ comparison: mockComparison(docA.file_name, docB.file_name) });
  }
}
