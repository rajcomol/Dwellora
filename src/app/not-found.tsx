import nl from "@/i18n/locales/nl.json";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start px-4 py-16">
      <p className="text-sm font-medium text-renovation-concrete">404</p>
      <h1 className="mt-1 text-3xl font-semibold text-foreground">{nl.notFound.title}</h1>
      <p className="mt-2 text-sm text-renovation-concrete">{nl.notFound.description}</p>
      <a
        href="/dashboard"
        className="mt-6 inline-flex rounded-md bg-renovation-accent px-4 py-2 text-sm font-medium text-white hover:bg-renovation-steel"
      >
        {nl.notFound.dashboard}
      </a>
    </div>
  );
}
