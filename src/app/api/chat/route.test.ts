import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { buildProjectContext } from "@/lib/ai/buildProjectContext";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const EXPENSE_ID = "22222222-2222-4222-8222-222222222222";
const ROOM_ID = "33333333-3333-4333-8333-333333333333";
const TASK_ID = "44444444-4444-4444-8444-444444444444";

function mockSupabaseForContext() {
  const projectRow = {
    id: PROJECT_ID,
    name: "Testrenovatie",
    total_budget: 150000,
    own_contribution: 50000,
    construction_depot_total: 100000,
    address: "Teststraat 1",
    expected_key_handover: "2026-06-01",
    planning_start_date: "2026-03-01",
    notes: "Proefproject",
  };

  const expenseRow = {
    id: EXPENSE_ID,
    project_id: PROJECT_ID,
    title: "Keuken leverancier",
    amount: 12000,
    spent_on: "2026-03-15",
    notes: "Offerte geaccepteerd",
    created_at: "2026-03-10T10:00:00Z",
    task_id: null,
    funded_by_construction_depot: true,
    kost_type: "werkelijk",
    categorie: "keuken",
    bouwdepot_status: "ingediend",
  };

  const documentRow = {
    file_name: "offerte-a.pdf",
    ai_summary: "A".repeat(850),
  };

  const roomRow = { id: ROOM_ID, name: "Keuken", project_id: PROJECT_ID };
  const taskRow = {
    id: TASK_ID,
    title: "Keuken plaatsen",
    status: "todo",
    duration_days: 5,
    priority: "high",
    description: "",
    sort_order: 1,
  };
  const taskRoomRow = { task_id: TASK_ID, room_id: ROOM_ID };

  return {
    from(table: string) {
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            if (table === "projects" && col === "id") {
              return { maybeSingle: async () => ({ data: projectRow, error: null }) };
            }
            if (table === "rooms" && col === "project_id") {
              return Promise.resolve({ data: [roomRow], error: null });
            }
            if (table === "documents" && col === "project_id") {
              return Promise.resolve({ data: [documentRow], error: null });
            }
            if (table === "project_expenses" && col === "project_id") {
              return Promise.resolve({ data: [expenseRow], error: null });
            }
            return Promise.resolve({ data: [], error: null });
          },
          in: (col: string, ids: string[]) => {
            if (table === "task_rooms" && col === "room_id") {
              return Promise.resolve({ data: [taskRoomRow], error: null });
            }
            if (table === "tasks" && col === "id") {
              return Promise.resolve({ data: [taskRow], error: null });
            }
            void ids;
            return Promise.resolve({ data: [], error: null });
          },
        }),
      };
    },
  };
}

describe("buildProjectContext", () => {
  it("bevat budgetoverzicht, kostenposten, planning en offertes", async () => {
    const result = await buildProjectContext(
      mockSupabaseForContext() as unknown as Parameters<typeof buildProjectContext>[0],
      PROJECT_ID
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const text = result.text;
    expect(text).toContain("Geselecteerd project: Testrenovatie");
    expect(text).toContain("Eigen geld: €50000");
    expect(text).toContain("Bouwdepot-totaal: €100000");
    expect(text).toContain("Planning startdatum: 2026-03-01");
    expect(text).toContain("BUDGETOVERZICHT:");
    expect(text).toContain("Totaal budget: €150000");
    expect(text).toContain("Besteed (som kostenposten): €12000");
    expect(text).toContain("Bouwdepot ingediend: €12000");
    expect(text).toContain("Kostenposten (per categorie):");
    expect(text).toContain("### Keuken");
    expect(text).toContain("Keuken leverancier: €12000");
    expect(text).toContain("werkelijke kosten");
    expect(text).toContain("uit bouwdepot, status: ingediend");
    expect(text).toContain("Geüploade offertes:");
    expect(text).toContain("offerte-a.pdf:");
    expect(text).toContain("A".repeat(800));
    expect(text).not.toContain("A".repeat(801));
    expect(text).toContain("geschatte duur ca. 5 werkdagen");
    expect(text).not.toContain("duration_days");
    expect(text).not.toContain("sort_order");
    expect(text).not.toContain("kost_type");
    expect(text).not.toContain("start_date");
  });
});

describe("POST /api/chat", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.stubEnv("RATE_LIMIT_TRUST_FORWARDED", "1");
  });

  it("returns 400 when message missing", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns mock response without auth when no API key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-forwarded-for": "127.0.0.1",
      },
      body: JSON.stringify({ message: "Hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = (await res.json()) as { response?: string; threadId?: string | null };
    expect(data.response ?? "").toContain("Mock-antwoord");
    expect(data.threadId ?? null).toBeNull();
  });
});
