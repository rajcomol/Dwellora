import { completeChat } from "@/lib/ai/completeChat";
import { getComparePdfMaxCharsPerDoc, truncateTextForModel } from "@/lib/ai/limits";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
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
    `Ik kan **${fileName}** nu niet inhoudelijk beoordelen — de tekst is niet betrouwbaar uitgelezen. Dit is dus geen oordeel over prijs of scope, alleen wat je zelf nog moet nalopen.`,
    "",
    "Zonder de echte posten zie je niet of de offerte compleet is. Check in elk geval: staan stelposten en meerwerk expliciet geregeld, wie afvoer en vergunning doet, hoe btw is verwerkt, en tot wanneer de offerte geldt met welke betaaltermijnen.",
    "",
    "Vragen die ik nu al zou stellen:",
    "- Welke posten zijn inclusief en wat rekent de aannemer als meerwerk?",
    "- Zitten afvoer, opruimen en nazorg in de prijs?",
    "- Wat is de geldigheidsduur en wanneer betaal je welk deel?",
  ].join("\n");
}

const SUMMARIZE_SYSTEM_PROMPT = [
  "Je leest een renovatie-offerte alsof je een ervaren aannemer/bouwkundige bent die een goede vriend helpt: direct, concreet, met een echt oordeel. Nuchter Nederlands, geen marketingtaal, geen formele AI-toon.",
  "Geef een echte conclusie vroeg in je antwoord: oogt dit compleet, redelijk, of scheef — en waarom? Durf een standpunt in te nemen waar de tekst dat toelaat; niet alleen neutraal beschrijven.",
  "Verwijs naar wat er écht in de offerte staat: specifieke posten, bedragen, formuleringen. Geen clichés die op elke offerte slaan.",
  "Wat ontbreekt: noem concreet wat je bij dít soort werk zou verwachten en hier mist (stelposten, afvoer, vergunning, meerwerkregeling, btw, geldigheidsduur, betaaltermijnen) — alleen waar het relevant is.",
  "Vermijd AI-tics: geen holle opening- of slotzinnen, geen 'het is belangrijk om…' / 'zorg ervoor dat…', geen overdreven disclaimers of herhaling.",
  "Geen vast skelet met dezelfde koppen elke keer. Gebruik markdown-koppen (##) alleen waar ze helpen; laat de inhoud leiden. Elke zin moet iets toevoegen.",
  "Wees uitgebreid genoeg om echt te helpen (richtlijn 250–450 woorden als de bron dat toelaat). Liever scherpe, concrete observaties dan oppervlakkige bullets.",
  "Sluit af met 2–3 scherpe vragen die je aan déze aannemer zou stellen, toegespitst op wat er in de offerte staat of mist.",
  "Verzin nooit bedragen of voorwaarden die niet in de tekst staan. Kun je iets niet beoordelen (bijv. prijs zonder referentie), zeg dat eerlijk.",
].join("\n");

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(`docs:summarize:${ip}`, RATE_LIMIT.documentsSummarize.limit, RATE_LIMIT.documentsSummarize.windowMs, {
    scope: "docs:summarize",
    clientIp: ip,
  });
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
          content: SUMMARIZE_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Lees deze offertetekst door en geef je oordeel:\n\n${extractedText}`,
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
