import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { getChatMaxOutputTokens } from "@/lib/ai/limits";
import { buildOpenAIChatCompletionBody } from "@/lib/ai/openaiChatCompletionParams";

export type ChatMessageParam = ChatCompletionMessageParam;

/**
 * Single entry point for chat completions. Extend with AI_PROVIDER when adding Anthropic etc.
 * Output length is capped via env `OPENAI_MAX_OUTPUT_TOKENS` (see `getChatMaxOutputTokens`).
 * GPT-5 / o-series use `max_completion_tokens` and omit custom temperature.
 */
export async function completeChat(params: {
  messages: ChatMessageParam[];
  model?: string;
  temperature?: number;
  /** Overrides env default when set. */
  maxTokens?: number;
}): Promise<string> {
  const provider = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  if (provider !== "openai") {
    console.warn(`AI_PROVIDER=${provider} not implemented; falling back to openai`);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const openai = new OpenAI({ apiKey });
  const model = params.model ?? process.env.OPENAI_MODEL ?? "gpt-5.4";
  const maxTokens = params.maxTokens ?? getChatMaxOutputTokens();
  const completion = await openai.chat.completions.create(
    buildOpenAIChatCompletionBody({
      model,
      messages: params.messages,
      maxTokens,
      temperature: params.temperature ?? 0.7,
    })
  );

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Empty completion from model");
  }
  return text;
}