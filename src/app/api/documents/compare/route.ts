import OpenAI from "openai";
import { getCompareMaxOutputTokens, getComparePdfMaxCharsPerDoc, truncateTextForModel } from "@/lib/ai/limits";
import { buildOpenAIChatCompletionBody } from "@/lib/ai/openaiChatCompletionParams";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
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
    `Ik kan **${nameA}** en **${nameB}** nu niet inhoudelijk naast elkaar zetten — de tekst is niet betrouwbaar uitgelezen. Geen winnaar kiezen op basis van dit fallback-antwoord.`,
    "",
    "Wat je wél kunt doen: leg beide PDF's naast elkaar en vergelijk per post wat inbegrepen is, welke stelposten er staan, hoe meerwerk is geregeld, en of planning, garantie en betaaltermijnen even expliciet zijn.",
    "",
    "Vragen die ik bij twijfel altijd stel:",
    "- Waarom wijkt de totaalprijs af — andere scope, andere materialen, of ontbrekende posten?",
    "- Welke offerte is completer over afvoer, vergunning en nazorg?",
    "- Wat is de geldigheidsduur en welke betalingstermijnen gelden per offerte?",
  ].join("\n");
}

const COMPARISON_SYSTEM_PROMPT = [
  "Je vergelijkt twee renovatie-offertes voor een goede vriend, als ervaren bouwkundige: direct, concreet, met een echt oordeel. Nuchter Nederlands, geen marketingtaal, geen formele AI-toon.",
  "Begin met je overall oordeel: welke offerte zou je nu kiezen, of blijf je twijfelend — en waarom? Durf een standpunt in te nemen waar de tekst dat toelaat.",
  "Verwijs naar wat er écht in beide offertes staat: specifieke posten, bedragen, formuleringen. Geen clichés die op elke offerte slaan.",
  "Leg de echte verschillen bloot: scope, prijs (alleen als bedragen in de tekst staan), planning, garanties, meerwerkregeling, stelposten — niet alles hoeft aan bod als het niet speelt.",
  "Wat ontbreekt: noem concreet wat je bij dít soort werk zou verwachten en in één of beide offertes mist — alleen waar relevant.",
  "Vermijd AI-tics: geen holle opening- of slotzinnen, geen 'het is belangrijk om…' / 'zorg ervoor dat…', geen overdreven disclaimers of herhaling.",
  "Geen vast skelet met dezelfde koppen elke keer. Gebruik markdown-koppen (##) alleen waar ze helpen; laat de inhoud leiden. Elke zin moet iets toevoegen.",
  "Wees uitgebreid genoeg om echt te helpen (richtlijn 500–900 woorden als de bron dat toelaat). Liever scherpe observaties dan oppervlakkige bullets.",
  "Sluit af met 2–3 scherpe vragen die je aan déze aannemer(s) zou stellen, toegespitst op verschillen en lacunes die je ziet.",
  "Verzin nooit bedragen of voorwaarden die niet in de tekst staan. Kun je iets niet beoordelen, zeg dat eerlijk.",
].join("\n");

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(`docs:compare:${ip}`, RATE_LIMIT.documentsCompare.limit, RATE_LIMIT.documentsCompare.windowMs, {
    scope: "docs:compare",
    clientIp: ip,
  });
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
  const model = process.env.OPENAI_MODEL ?? "gpt-5.4";

  const userContent = [
    `Offerte A (${docA.file_name}, id ${docA.id}):`,
    textA,
    "",
    `Offerte B (${docB.file_name}, id ${docB.id}):`,
    textB,
  ].join("\n");

  try {
    const completion = await openai.chat.completions.create(
      buildOpenAIChatCompletionBody({
        model,
        maxTokens: getCompareMaxOutputTokens(),
        temperature: 0.55,
        messages: [
          { role: "system", content: COMPARISON_SYSTEM_PROMPT },
          { role: "user", content: `Vergelijk deze twee offertes en geef je oordeel:\n\n${userContent}` },
        ],
      })
    );

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
