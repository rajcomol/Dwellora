import RoomsPageClient from "@/components/dashboard/RoomsPageClient";

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  return <RoomsPageClient initialTab={tab} />;
}
