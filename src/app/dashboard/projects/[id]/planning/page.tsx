import PlanningPageClient from "@/components/dashboard/PlanningPageClient";

export default async function ProjectPlanningRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  return <PlanningPageClient projectId={projectId ?? ""} />;
}
