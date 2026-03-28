import type { Metadata } from "next";
import Link from "next/link";
import nl from "@/i18n/locales/nl.json";

export const metadata: Metadata = {
  title: `${nl.privacy.title} | ${nl.brand.name}`,
  description: nl.privacy.lead,
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 text-zinc-900 dark:text-zinc-50">
      <h1 className="text-3xl font-semibold">{nl.privacy.title}</h1>
      <div className="mt-8 space-y-6 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
        <p>{nl.privacy.lead}</p>
        <p>{nl.privacy.hosting}</p>
        <p>{nl.privacy.documents}</p>
        <p>{nl.privacy.ai}</p>
        <p>{nl.privacy.contact}</p>
      </div>
      <Link
        href="/dashboard"
        className="mt-10 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {nl.privacy.back}
      </Link>
    </div>
  );
}
