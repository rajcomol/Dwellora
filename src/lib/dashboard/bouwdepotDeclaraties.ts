import type { BouwdepotDeclaratie, BouwdepotDeclaratieTotals, ID } from "@/lib/renovation/types";

export function computeDeclaratieTotals(
  declaraties: BouwdepotDeclaratie[],
  projectId: ID
): BouwdepotDeclaratieTotals {
  const projectDecl = declaraties.filter((d) => d.projectId === projectId);
  let totaalUitbetaald = 0;
  let totaalIngediend = 0;
  let totaalOpen = 0;

  for (const d of projectDecl) {
    const bedrag = Number.isFinite(d.bedrag) ? d.bedrag : 0;
    if (d.status === "uitbetaald") {
      totaalUitbetaald += bedrag;
    } else if (d.status === "ingediend" || d.status === "uitbetaling_verwacht") {
      totaalIngediend += bedrag;
    } else if (d.status === "open") {
      totaalOpen += bedrag;
    }
  }

  return { totaalUitbetaald, totaalIngediend, totaalOpen };
}

export function declaratieStatusBadgeClass(status: BouwdepotDeclaratie["status"]): string {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300";
    case "ingediend":
    case "uitbetaling_verwacht":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300";
    case "uitbetaald":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
    default:
      return "bg-renovation-muted text-renovation-concrete";
  }
}
