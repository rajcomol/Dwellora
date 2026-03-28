import ProjectDetailPageClient from "@/components/dashboard/ProjectDetailPageClient";

export default async function ProjectDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  return <ProjectDetailPageClient projectId={projectId ?? ""} />;
}
