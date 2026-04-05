import ProjectSubnav from "@/components/dashboard/ProjectSubnav";

export default async function ProjectIdLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const projectId = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = projectId ?? "";

  return (
    <div className="min-w-0 space-y-4">
      {id ? <ProjectSubnav projectId={id} /> : null}
      {children}
    </div>
  );
}
