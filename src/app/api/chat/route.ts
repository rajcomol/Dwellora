import { buildProjectContext } from "@/lib/ai/buildProjectContext";
import { completeChat, type ChatMessageParam } from "@/lib/ai/completeChat";
import { clientIpFromRequest, RATE_LIMIT, rateLimitResponse } from "@/lib/api/rateLimit";
import { createUserSupabaseFromRequest } from "@/lib/supabase/api-auth";
import { isUuid } from "@/lib/supabase/project-access";
import { jsonValidationError, readJsonUnknown } from "@/lib/validation/http";
import { chatPostBodySchema } from "@/lib/validation/schemas";
import { getHelpKnowledgeForModel } from "@/lib/help/helpKnowledgeForModel";

function mockAssistantReply(message: string) {
  const clip = message.length > 280 ? `${message.slice(0, 277)}…` : message;
  return [
    "## Mock-antwoord",
    "",
    `Ik heb je bericht ontvangen (zonder actieve API-sleutel gebruiken we een vaste placeholder):`,
    "",
    `> ${clip}`,
    "",
    "Zodra **OPENAI_API_KEY** is ingesteld, kan ik gerichter adviseren over kosten, materialen en volgorde voor je renovatie — nog steeds in Markdown.",
  ].join("\n");
}

export const runtime = "nodejs";

const RENOVATION_COACH_SYSTEM_PROMPT = [
  "Je bent een ervaren verbouw-vriend die meedenkt over het project van de gebruiker in RenoTasker: direct, concreet, met een echt oordeel. Nuchter Nederlands, geen marketingtaal, geen formele AI-toon — je vertelt het alsof je naast iemand zit, geen rapport dat je invult.",
  "Antwoord standaard in het Nederlands, tenzij de gebruiker duidelijk in een andere taal schrijft; schakel dan mee in die taal.",
  "VORM — default is lopende tekst: een paar korte alinea's, zoals een verbouw-vriend die iets uitlegt. Koppen (##) en bullets zijn de uitzondering, niet de norm.",
  "Gebruik koppen of lijsten ALLEEN als er echt veel losse, gelijkwaardige punten te ordenen zijn (bijv. een echte stappenlijst). Voor de meeste vragen: geen koppen, hooguit één.",
  "Noem nooit dezelfde cijfers of conclusie twee keer. Geen losse 'Conclusie'- of samenvattingssectie die herhaalt wat al gezegd is.",
  "Schaal de lengte naar wat er te zeggen valt. Lengte volgt de inhoud; korte vraag of weinig data (bijv. leeg project) = kort, eerlijk antwoord — niet oppompen tot een rapport met meerdere secties.",
  "Varieer de opbouw per vraag; geen vast stramien of vaste koppenreeks.",
  "Gebruik de meegestuurde projectcontext concreet: verwijs naar het échte budget, besteed/resterend, bouwdepot (gebruikt/ingediend/uitbetaald/resterend), kostenposten per categorie en geüploade offertes — geen algemeenheden waar data beschikbaar is.",
  "Offerte-expertise waar relevant: inbegrepen vs. meerwerk, stelposten, planning, garanties, betaaltermijnen — met concrete vragen aan de aannemer als dat past.",
  "Wees proactief waar het zinvol is: benoem risico's, ontbrekende data en vervolgstappen — kort verweven in de tekst, niet als aparte checklist tenzij de vraag daarom vraagt.",
  "App-uitleg: je krijgt een aparte kennisbank met RenoTasker-help. Gebruik die voor navigatie, schermen en instellingen. Verzin geen functies die daar niet staan.",
  "Vermijd AI-tics: geen holle opening- of slotzinnen, geen 'het is belangrijk om…' / 'zorg ervoor dat…', geen overdreven disclaimers of herhaling. Elke zin moet iets toevoegen.",
  "Gebruik nooit technische veld- of kolomnamen uit de app. Spreek altijd in natuurlijk Nederlands dat een huiseigenaar begrijpt.",
  "Veiligheid en eerlijkheid gaan vóór gezelligheid: waarschuw voor risico's (elektriciteit, dragende constructies, vocht, gas). Verzin geen prijzen, maten of garanties die niet in de context staan.",
  "Kosten: nooit bedragen verzinnen; gebruik alleen cijfers uit de projectcontext of spreek van indicaties als data ontbreekt.",
  "Als projectdata ontbreekt: zeg kort wat er mist en wat de gebruiker kan toevoegen — zonder een lang opsommingrapport.",
  "Scope: renovatie/verbouwen/offertes/planning/financiën in deze app én uitleg over RenoTasker. Geen antwoorden op puur privé-, medische of relationele vragen zonder link met de klus of app.",
  "Opmaak: markdown alleen waar het echt helpt (**vet** voor nadruk); geen raw HTML.",
].join("\n");

export async function GET(req: Request) {
  const ip = clientIpFromRequest(req);
  const rl = rateLimitResponse(`chat:get:${ip}`, RATE_LIMIT.chatGet.limit, RATE_LIMIT.chatGet.windowMs, {
    scope: "chat:get",
    clientIp: ip,
  });
  if (rl) return rl;

  const auth = await createUserSupabaseFromRequest(req);
  if (!auth) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(req.url);
  const threadId = url.searchParams.get("threadId");

  if (threadId) {
    if (!isUuid(threadId)) {
      return Response.json({ error: "Invalid threadId." }, { status: 400 });
    }
    const th = await auth.client.from("chat_threads").select("id").eq("id", threadId).maybeSingle();
    if (!th.data) {
      return Response.json({ error: "Thread not found." }, { status: 404 });
    }
    const msgRes = await auth.client
      .from("chat_messages")
      .select("id,role,content,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });
    if (msgRes.error) {
      return Response.json({ error: msgRes.error.message }, { status: 500 });
    }
    const rows = msgRes.data ?? [];
    return Response.json({
      messages: rows.map((r) => ({
        id: String(r.id),
        role: r.role === "assistant" || r.role === "user" ? r.role : "user",
        content: String(r.content ?? ""),
      })),
    });
  }

  const listRes = await auth.client
    .from("chat_threads")
    .select("id,title,project_id,updated_at,created_at")
    .order("updated_at", { ascending: false })
    .limit(30);

  if (listRes.error) {
    return Response.json({ error: listRes.error.message }, { status: 500 });
  }

  return Response.json({
    threads: (listRes.data ?? []).map((t) => ({
      id: String(t.id),
      title: String(t.title ?? "Chat"),
      projectId: t.project_id ? String(t.project_id) : null,
      updatedAt: String(t.updated_at ?? ""),
    })),
  });
}

export async function POST(req: Request) {
  const ip = clientIpFromRequest(req);
  const authEarly = await createUserSupabaseFromRequest(req);
  const postPreset = authEarly ? RATE_LIMIT.chatPostAuthenticated : RATE_LIMIT.chatPostAnonymous;
  const rlKey = authEarly
    ? `chat:post:user:${authEarly.userId}`
    : `chat:post:anon:${ip}`;
  const rl = rateLimitResponse(rlKey, postPreset.limit, postPreset.windowMs, {
    scope: "chat:post",
    clientIp: ip,
  });
  if (rl) return rl;

  const rawBody = await readJsonUnknown(req);
  const parsedBody = chatPostBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return jsonValidationError(parsedBody.error);
  }

  const { message, projectId, threadId: threadIdIn } = parsedBody.data;

  const auth = authEarly;
  const usePersistence = Boolean(auth);

  let projectContext = "";
  if (projectId) {
    if (!auth) {
      return Response.json({ error: "Sign in to use project context." }, { status: 401 });
    }
    const built = await buildProjectContext(auth.client, projectId);
    if (!built.ok) {
      return Response.json({ error: built.error }, { status: built.status });
    }
    projectContext = built.text;
  }

  let threadIdOut: string | null = null;
  const historyForModel: ChatMessageParam[] = [];

  if (usePersistence && auth) {
    let activeThreadId = threadIdIn;

    if (activeThreadId) {
      const own = await auth.client.from("chat_threads").select("id").eq("id", activeThreadId).maybeSingle();
      if (!own.data) {
        return Response.json({ error: "Thread not found." }, { status: 404 });
      }
    } else {
      const title = message.length > 60 ? `${message.slice(0, 57)}…` : message;
      const ins = await auth.client
        .from("chat_threads")
        .insert({
          user_id: auth.userId,
          project_id: projectId,
          title,
        })
        .select("id")
        .single();
      if (ins.error || !ins.data) {
        console.error("chat thread insert", ins.error?.message);
        return Response.json({ error: "Could not start chat thread." }, { status: 500 });
      }
      activeThreadId = String(ins.data.id);
    }

    threadIdOut = activeThreadId;

    const prev = await auth.client
      .from("chat_messages")
      .select("role,content")
      .eq("thread_id", activeThreadId)
      .order("created_at", { ascending: true })
      .limit(40);

    if (prev.error) {
      return Response.json({ error: prev.error.message }, { status: 500 });
    }

    for (const row of prev.data ?? []) {
      const role = row.role === "assistant" ? "assistant" : "user";
      const content = String(row.content ?? "");
      if (!content) continue;
      historyForModel.push({ role, content });
    }

    const userIns = await auth.client.from("chat_messages").insert({
      thread_id: activeThreadId,
      role: "user",
      content: message,
    });
    if (userIns.error) {
      return Response.json({ error: userIns.error.message }, { status: 500 });
    }
    historyForModel.push({ role: "user", content: message });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const text = mockAssistantReply(message);
    if (usePersistence && auth && threadIdOut) {
      await auth.client.from("chat_messages").insert({
        thread_id: threadIdOut,
        role: "assistant",
        content: text,
      });
      await auth.client.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadIdOut);
    }
    return Response.json({ response: text, threadId: threadIdOut });
  }

  const helpKbResult = getHelpKnowledgeForModel();
  const helpKbSystemParts = [
    "Interne kennisbank (RenoTasker-help). Gebruik dit voor vragen over de app (navigatie, functies, tabs, offertes, financiën, AI, samenwerking). Antwoord accuraat; verzin geen schermen of menu’s die hier niet staan. Als iets ontbreekt, zeg dat eerlijk.",
  ];
  if (helpKbResult.truncated) {
    helpKbSystemParts.push(
      "Let op: onderstaande tekst is ingekort; baseer je alleen op wat volgt."
    );
  }
  helpKbSystemParts.push("", helpKbResult.text);
  const helpKbSystemContent = helpKbSystemParts.join("\n");

  const messages: ChatMessageParam[] = [
    { role: "system", content: RENOVATION_COACH_SYSTEM_PROMPT },
    { role: "system", content: helpKbSystemContent },
    ...(projectContext
      ? [
          {
            role: "system" as const,
            content: `Gebruik onderstaande projectcontext bij je advies. Baseer je antwoord op deze data, gebruik de cijfers concreet in natuurlijk Nederlands (geen technische veldnamen) en benoem expliciet ontbrekende gegevens:\n${projectContext}`,
          },
        ]
      : []),
    ...historyForModel.slice(0, -1),
    { role: "user", content: message },
  ];

  try {
    const responseText = await completeChat({ messages, temperature: 0.7 });

    if (usePersistence && auth && threadIdOut) {
      await auth.client.from("chat_messages").insert({
        thread_id: threadIdOut,
        role: "assistant",
        content: responseText,
      });
      await auth.client.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadIdOut);
    }

    return Response.json({ response: responseText, threadId: threadIdOut });
  } catch (e: unknown) {
    const error = e as { name?: string; message?: string; code?: string; status?: number; statusCode?: number };
    console.error("Chat completion error", {
      name: error?.name,
      code: error?.code,
      status: error?.status ?? error?.statusCode,
      message: error?.message,
    });
    const text = mockAssistantReply(message);
    if (usePersistence && auth && threadIdOut) {
      await auth.client.from("chat_messages").insert({
        thread_id: threadIdOut,
        role: "assistant",
        content: text,
      });
      await auth.client.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", threadIdOut);
    }
    return Response.json({ response: text, threadId: threadIdOut }, { status: 200 });
  }
}
