/**
 * Parse `token` from a `next` path like `/invite/accept?token=...` (used on login/register).
 */
export function parseTokenFromInviteNext(next: string | null): string | null {
  if (!next?.includes("/invite/accept")) return null;
  const q = next.indexOf("?");
  const search = q >= 0 ? next.slice(q) : "";
  const raw = new URLSearchParams(search).get("token")?.trim() ?? "";
  return raw || null;
}

export function isInviteAcceptNext(next: string | null): boolean {
  return Boolean(next?.includes("/invite/accept"));
}
