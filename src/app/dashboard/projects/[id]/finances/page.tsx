import { redirect } from "next/navigation";

export default async function ProjectFinancesRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  const qs = new URLSearchParams();
  if (projectId) qs.set("project", projectId);
  qs.set("tab", "uitgaven");
  redirect(`/dashboard/finances?${qs.toString()}`);
}
