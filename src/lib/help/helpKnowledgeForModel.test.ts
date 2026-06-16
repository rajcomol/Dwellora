import { describe, expect, it } from "vitest";
import { buildHelpKnowledgeText, getHelpKnowledgeForModel } from "@/lib/help/helpKnowledgeForModel";

describe("helpKnowledgeForModel", () => {
  it("buildHelpKnowledgeText is non-empty and includes a known article title", () => {
    const text = buildHelpKnowledgeText();
    expect(text.length).toBeGreaterThan(100);
    expect(text).toContain("Welkom: het dashboard als startpunt");
    expect(text).toContain("welcome-overview");
  });

  it("getHelpKnowledgeForModel returns text without removed report articles", () => {
    const { text, truncated } = getHelpKnowledgeForModel();
    expect(text.length).toBeGreaterThan(0);
    expect(typeof truncated).toBe("boolean");
    expect(text).toContain("RenoTasker");
    expect(text).not.toContain("reports-insights");
    expect(text).not.toContain("Rapporten aggregeren");
    expect(text).toContain("tasks-manage");
    expect(text).toContain("sfeerbeeld");
    expect(text).toContain("bouwdepot");
    expect(text).toContain("Projecten: aanmaken en kiezen");
  });
});
