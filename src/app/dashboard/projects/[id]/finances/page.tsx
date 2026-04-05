import ProjectFinancesPageClient from "@/components/finances/ProjectFinancesPageClient";

export default async function ProjectFinancesRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  return <ProjectFinancesPageClient projectId={projectId ?? ""} />;
}
