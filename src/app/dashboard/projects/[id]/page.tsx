import { redirect } from "next/navigation";

export default async function ProjectDetailRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id: idParam } = await params;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (projectId) qs.set("project", projectId);
  for (const [k, v] of Object.entries(sp)) {
    if (k === "project") continue;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, x));
    else if (v != null) qs.set(k, v);
  }
  const query = qs.toString();
  redirect(`/dashboard/rooms${query ? `?${query}` : ""}`);
}
