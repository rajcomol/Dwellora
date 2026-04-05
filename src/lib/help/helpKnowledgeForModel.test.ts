import { describe, expect, it } from "vitest";
import { buildHelpKnowledgeText, getHelpKnowledgeForModel } from "@/lib/help/helpKnowledgeForModel";

describe("helpKnowledgeForModel", () => {
  it("buildHelpKnowledgeText is non-empty and includes a known article title", () => {
    const text = buildHelpKnowledgeText();
    expect(text.length).toBeGreaterThan(100);
    expect(text).toContain("Welkom bij RenoTasker");
    expect(text).toContain("welcome-overview");
  });

  it("getHelpKnowledgeForModel returns text", () => {
    const { text, truncated } = getHelpKnowledgeForModel();
    expect(text.length).toBeGreaterThan(0);
    expect(typeof truncated).toBe("boolean");
    expect(text).toContain("RenoTasker");
  });
});
