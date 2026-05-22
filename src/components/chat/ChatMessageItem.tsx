"use client";

import ChatMarkdown from "@/components/chat/ChatMarkdown";

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
            ? "bg-renovation-accent text-white ring-renovation-accent dark:bg-renovation-elevated dark:text-foreground dark:ring-renovation-border"
            : "bg-renovation-elevated text-foreground ring-renovation-border dark:bg-renovation-elevated dark:text-foreground dark:ring-renovation-border",
        ].join(" ")}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap">{message.content}</div>
        ) : (
          <ChatMarkdown content={message.content} />
        )}
      </div>
    </li>
  );
}

