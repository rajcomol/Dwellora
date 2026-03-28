import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export type ChatMessageParam = ChatCompletionMessageParam;

/**
 * Single entry point for chat completions. Extend with AI_PROVIDER when adding Anthropic etc.
 */
export async function completeChat(params: {
  messages: ChatMessageParam[];
  model?: string;
  temperature?: number;
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
  const model = params.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const completion = await openai.chat.completions.create({
    model,
    messages: params.messages,
    temperature: params.temperature ?? 0.7,
  });

  const text = completion.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Empty completion from model");
  }
  return text;
}
