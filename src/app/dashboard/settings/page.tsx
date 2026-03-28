import nl from "@/i18n/locales/nl.json";

export default function DashboardSettingsPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">{nl.settings.title}</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{nl.settings.subtitle}</p>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-medium">{nl.settings.comingSoon}</div>
        <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{nl.settings.placeholderBody}</div>
      </div>
    </div>
  );
}
