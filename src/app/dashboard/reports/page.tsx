import { redirect } from "next/navigation";

export default async function DashboardReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();
  const project = sp.project;
  const projectId = Array.isArray(project) ? project[0] : project;
  if (projectId && typeof projectId === "string") {
    params.set("project", projectId);
  }
  const qs = params.toString();
  redirect(qs ? `/dashboard/finances?${qs}` : "/dashboard/finances");
}
