import type { Metadata } from "next";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: nl.meta.inviteAcceptTitle,
  description: nl.meta.inviteAcceptDescription,
};

export default function InviteAcceptLayout({ children }: { children: React.ReactNode }) {
  return children;
}
