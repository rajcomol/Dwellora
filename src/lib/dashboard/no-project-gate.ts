/** Routes reachable before the user has created their first project. */
export function isPathAllowedWithoutProjects(pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path === "/dashboard") return true;
  if (path === "/dashboard/projects") return true;
  if (path.startsWith("/dashboard/help")) return true;
  if (path.startsWith("/dashboard/settings")) return true;
  return false;
}
