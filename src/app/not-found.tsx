import nl from "@/i18n/locales/nl.json";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-16">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">404</p>
      <h1 className="mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">{nl.notFound.title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{nl.notFound.description}</p>
      <a
        href="/dashboard"
        className="mt-6 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
      >
        {nl.notFound.dashboard}
      </a>
    </div>
  );
}

