"use client";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

export default function ChatMessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <li className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={[
          "max-w-[80ch] rounded-xl px-4 py-3 text-sm leading-6 shadow-sm ring-1 ring-inset",
          isUser
            ? "bg-zinc-900 text-white ring-zinc-900 dark:bg-white dark:text-black dark:ring-white/30"
            : "bg-white text-zinc-900 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-50 dark:ring-zinc-800",
        ].join(" ")}
      >
        <div className="whitespace-pre-wrap">{message.content}</div>
      </div>
    </li>
  );
}

