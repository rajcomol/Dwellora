import type { SupabaseClient } from "@supabase/supabase-js";
import { completeChat, type ChatMessageParam } from "@/lib/ai/completeChat";
import {
  CHAT_CONTEXT_MAX_TASKS_PER_ROOM,
  getProjectContextMaxChars,
  truncateTextForModel,
} from "@/lib/ai/limits";
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
  "Je bent een ervaren, warme renovatie-assistent in deze app: je helpt bij plannen, keuzes en stress rond de klus — als een goede vriend: empathisch en direct, zonder marketingpraat of overdreven formaliteit.",
  "Antwoord standaard in het Nederlands, tenzij de gebruiker duidelijk in een andere taal schrijft; schakel dan mee in die taal.",
  "Domein: woningrenovatie en alles wat daarbij hoort: volgorde van werk, afhankelijkheden, aannemer vs. zelf doen, vergunningen en regels, materialen en kwaliteit, planning en buffer, budget en inschattingen (altijd voorzichtig), stress en prioriteit — ook als er weinig data in de app staat. Gebruik projectcontext als die er is; vul aan met algemene, realistische richtlijnen.",
  "App-uitleg: je krijgt een aparte kennisbank met RenoTasker-help. Gebruik die om vragen over navigatie, schermen, offertes, financiën, Kluscoach, samenwerking en instellingen nauwkeurig te beantwoorden. Verzin geen functies of menu’s die niet in die kennisbank staan; als iets ontbreekt, zeg dat eerlijk.",
  "Structuur: geen verplichte vaste koppen bij elk antwoord. Gebruik alleen tussenkopjes of bullets als ze de leesbaarheid echt verbeteren; anders vloeiende alinea’s.",
  "Lengte: wees uitgebreid genoeg om echt te helpen (richtlijn ongeveer 250–400 woorden wanneer de vraag dat rechtvaardigt). Wees niet eindeloos; liever kernachtig dan opvullen.",
  "Veiligheid en eerlijkheid gaan vóór ‘gezelligheid’: waarschuw voor risico’s (bijv. elektriciteit, dragende constructies, vocht, gas) en verzin geen prijzen, maten of garanties die niet in de context staan.",
  "Kosten: geen verzonnen bedragen; spreek van indicaties of globale inschattingen en wat de gebruiker in de app kan aanvullen (budget, taken, offertes).",
  "Als projectdata ontbreekt of onvolledig is: zeg wat er mist en wat de gebruiker concreet kan toevoegen (kamers, taken, budget, duration_days, prioriteit, losse uitgaven).",
  "Scope: renovatie/verbouwen/offertes/planning in deze app én uitleg over hoe RenoTasker werkt (zie kennisbank). Geen antwoorden op puur privé-, medische, relationele of algemene levensvragen zonder link met de klus of de app. Bij zulke vragen: kort en vriendelijk doorverwijzen (bijv. stress rond de verbouwing structureren is wél oké; relatieadvies niet). Geen losse chit-chat zonder verbouw- of app-link.",
  "Opmaak: schrijf elk assistent-antwoord in GitHub Flavored Markdown — gebruik ## of ### voor koppen waar nuttig, genummerde of bulletlijsten, **vet** voor nadruk; geen raw HTML.",
  "Toon: warm en steunend, maar realistisch en nuchter.",
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

async function buildProjectContext(
  supabase: SupabaseClient,
  projectId: string
): Promise<{ ok: true; text: string } | { ok: false; status: number; error: string }> {
  const [projectRes, roomsRes, docsRes, expensesRes] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,total_budget,address,expected_key_handover,notes")
      .eq("id", projectId)
      .maybeSingle(),
    supabase.from("rooms").select("id,name,project_id").eq("project_id", projectId),
    supabase.from("documents").select("file_name,ai_summary").eq("project_id", projectId),
    supabase.from("project_expenses").select("title,amount,spent_on,notes").eq("project_id", projectId),
  ]);

  if (projectRes.error) {
    console.error("Chat project context", { projectError: projectRes.error.message });
    return { ok: false, status: 500, error: "Failed to load project." };
  }
  if (!projectRes.data) {
    return { ok: false, status: 404, error: "Project not found." };
  }

  if (roomsRes.error) {
    console.error("Chat project context", { roomsError: roomsRes.error.message });
    return { ok: false, status: 500, error: "Failed to load rooms." };
  }

  let tasksRes: {
    data: Array<Record<string, unknown>> | null;
    error: { message: string } | null;
  } = { data: [], error: null };

  const rooms = roomsRes.data ?? [];
  const roomIdList = rooms.map((room) => String(room.id));

  const taskRoomsByTask = new Map<string, string[]>();
  if (roomIdList.length > 0) {
    const trRes = await supabase.from("task_rooms").select("task_id,room_id").in("room_id", roomIdList);
    if (trRes.error) {
      console.error("Chat project context", { taskRoomsError: trRes.error.message });
      return { ok: false, status: 500, error: "Failed to load task rooms." };
    }
    for (const row of trRes.data ?? []) {
      const tid = String(row.task_id);
      const rid = String(row.room_id);
      const arr = taskRoomsByTask.get(tid) ?? [];
      arr.push(rid);
      taskRoomsByTask.set(tid, arr);
    }
    const taskIdList = [...taskRoomsByTask.keys()];
    if (taskIdList.length > 0) {
      tasksRes = await supabase
        .from("tasks")
        .select(
          "id,title,status,estimated_cost,actual_cost,duration_days,priority,description,sort_order,start_date"
        )
        .in("id", taskIdList);
    }
  }

  if (tasksRes.error) {
    console.error("Chat project context", { tasksError: tasksRes.error.message });
    return { ok: false, status: 500, error: "Failed to load tasks." };
  }

  const scopedTasks = tasksRes.data ?? [];

  const roomLines = rooms.map((room) => {
    const tasksForRoom = scopedTasks
      .filter((task) => (taskRoomsByTask.get(String(task.id)) ?? []).includes(String(room.id)))
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .slice(0, CHAT_CONTEXT_MAX_TASKS_PER_ROOM);
    const taskSummary =
      tasksForRoom.length === 0
        ? "no tasks yet"
        : tasksForRoom
            .map(
              (task) =>
                `${task.title} [${task.status}, ${task.priority}, ${task.duration_days}d, est ${task.estimated_cost}, actual ${task.actual_cost ?? 0}]`
            )
            .join("; ");
    return `- ${room.name}: ${taskSummary}`;
  });

  const looseExpenses = expensesRes.error ? [] : (expensesRes.data ?? []);
  const expenseLines =
    looseExpenses.length === 0
      ? ["- No loose project expenses recorded yet."]
      : looseExpenses.map((row: { title?: unknown; amount?: unknown; spent_on?: unknown; notes?: unknown }) => {
          const title = String(row.title ?? "");
          const amt = row.amount ?? 0;
          const when = row.spent_on != null && String(row.spent_on).trim() !== "" ? String(row.spent_on) : "no date";
          const note = row.notes != null && String(row.notes).trim() !== "" ? ` — ${String(row.notes).slice(0, 80)}` : "";
          return `- ${title}: ${amt} (${when})${note}`;
        });

  const docs = docsRes.error ? [] : (docsRes.data ?? []);
  const docLines =
    docs.length === 0
      ? ["- No uploaded documents for this project."]
      : docs.map((d: { file_name?: unknown; ai_summary?: unknown }) => {
          const fn = String(d.file_name ?? "file");
          const sum = d.ai_summary != null && String(d.ai_summary).trim() !== "";
          return sum
            ? `- ${fn} (summary): ${String(d.ai_summary).slice(0, 400)}${String(d.ai_summary).length > 400 ? "…" : ""}`
            : `- ${fn} (run Summarize in Documents to add context)`;
        });

  const p = projectRes.data as Record<string, unknown>;
  const text = [
    `Selected project: ${p.name} (${p.id})`,
    `Total budget: ${p.total_budget ?? 0}`,
    p.address ? `Address: ${p.address}` : "",
    p.expected_key_handover ? `Expected key handover: ${p.expected_key_handover}` : "",
    p.notes ? `Notes: ${String(p.notes).slice(0, 500)}${String(p.notes).length > 500 ? "…" : ""}` : "",
    `Rooms: ${rooms.length}`,
    `Tasks: ${scopedTasks.length}`,
    "Loose project expenses (hardware store, materials not tied to one task):",
    ...expenseLines,
    "Uploaded documents (for quote context):",
    ...docLines,
    "If any of these are missing, mention that clearly and ask the user to add them: rooms, tasks, total budget, duration_days, priority, and loose expenses if they shop outside tasks.",
    `Per room at most ${CHAT_CONTEXT_MAX_TASKS_PER_ROOM} tasks are listed (sorted by sort_order).`,
    "Room/task details:",
    ...roomLines,
  ]
    .filter(Boolean)
    .join("\n");

  const capped = truncateTextForModel(text, getProjectContextMaxChars());
  return { ok: true, text: capped.text };
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
            content: `Use this project context when giving advice. Ground your answer in this data and highlight missing planning data explicitly:\n${projectContext}`,
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
