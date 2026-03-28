"use client";

import dynamic from "next/dynamic";
import HeavyRouteFallback from "@/components/dashboard/HeavyRouteFallback";

const ChatClient = dynamic(() => import("@/components/chat/ChatClient"), {
  ssr: false,
  loading: () => <HeavyRouteFallback />,
});

export default function AssistantPageDynamic() {
  return <ChatClient />;
}
