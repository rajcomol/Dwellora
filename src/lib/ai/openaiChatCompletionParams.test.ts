import { describe, expect, it } from "vitest";
import {
  buildOpenAIChatCompletionBody,
  isReasoningChatModel,
} from "@/lib/ai/openaiChatCompletionParams";

describe("isReasoningChatModel", () => {
  it("herkent gpt-5 en o-series", () => {
    expect(isReasoningChatModel("gpt-5.4")).toBe(true);
    expect(isReasoningChatModel("GPT-5-mini")).toBe(true);
    expect(isReasoningChatModel("o1-preview")).toBe(true);
    expect(isReasoningChatModel("o3-mini")).toBe(true);
  });

  it("herkent klassieke chatmodellen niet", () => {
    expect(isReasoningChatModel("gpt-4o-mini")).toBe(false);
    expect(isReasoningChatModel("gpt-4o")).toBe(false);
  });
});

describe("buildOpenAIChatCompletionBody", () => {
  const messages = [{ role: "user" as const, content: "Hoi" }];

  it("gebruikt max_completion_tokens zonder temperature voor gpt-5", () => {
    const body = buildOpenAIChatCompletionBody({
      model: "gpt-5.4",
      messages,
      maxTokens: 500,
      temperature: 0.7,
    });
    expect(body.max_completion_tokens).toBe(500);
    expect(body).not.toHaveProperty("max_tokens");
    expect(body).not.toHaveProperty("temperature");
  });

  it("gebruikt max_tokens en temperature voor gpt-4o-mini", () => {
    const body = buildOpenAIChatCompletionBody({
      model: "gpt-4o-mini",
      messages,
      maxTokens: 1200,
      temperature: 0.55,
    });
    expect(body.max_tokens).toBe(1200);
    expect(body.temperature).toBe(0.55);
    expect(body).not.toHaveProperty("max_completion_tokens");
  });
});
