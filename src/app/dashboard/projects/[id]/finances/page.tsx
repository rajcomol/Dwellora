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
  const query = qs.toString();
  redirect(query ? `/dashboard/finances?${query}` : "/dashboard/finances");
}
