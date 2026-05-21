import ProjectSettingsPageClient from "@/components/dashboard/ProjectSettingsPageClient";

export default async function ProjectSettingsRoute({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idParam } = await params;
  const sp = await searchParams;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  const tab = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  return <ProjectSettingsPageClient projectId={projectId ?? ""} initialTab={tab} />;
}
