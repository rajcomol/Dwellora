"use client";

import ChatExperience from "@/components/chat/ChatExperience";

export default function ChatPanelContent({ routeSuggestedProjectId }: { routeSuggestedProjectId: string | null }) {
  return <ChatExperience routeSuggestedProjectId={routeSuggestedProjectId} />;
}
