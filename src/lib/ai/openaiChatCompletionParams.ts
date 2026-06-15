import type {
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions";

/** GPT-5 / o-series: max_completion_tokens, no custom temperature. */
export function isReasoningChatModel(model: string): boolean {
  const m = model.trim().toLowerCase();
  return m.startsWith("gpt-5") || /^o[1-9]/.test(m);
}

export function buildOpenAIChatCompletionBody(params: {
  model: string;
  messages: ChatCompletionMessageParam[];
  maxTokens: number;
  temperature?: number;
}): ChatCompletionCreateParamsNonStreaming {
  const { model, messages, maxTokens, temperature = 0.7 } = params;

  if (isReasoningChatModel(model)) {
    return {
      model,
      messages,
      max_completion_tokens: maxTokens,
    };
  }

  return {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
}
