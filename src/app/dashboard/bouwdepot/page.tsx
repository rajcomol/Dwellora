import { redirect } from "next/navigation";

export default async function BouwdepotRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const project = sp.project;
  const projectId = Array.isArray(project) ? project[0] : project;
  if (projectId && typeof projectId === "string") {
    redirect(`/dashboard/projects/${encodeURIComponent(projectId)}/settings`);
  }
  redirect("/dashboard/settings");
}
