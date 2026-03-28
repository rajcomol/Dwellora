"use client";

import type { ChatMessage } from "@/components/chat/ChatMessageItem";
import ChatMessageItem from "@/components/chat/ChatMessageItem";

export default function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  return (
    <ul className="space-y-3">
      {messages.map((m) => (
        <ChatMessageItem key={m.id} message={m} />
      ))}
    </ul>
  );
}

