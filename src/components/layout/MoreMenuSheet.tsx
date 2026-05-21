"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MOBILE_MORE_TABS,
  appendProjectQuery,
  tabNavLinkClass,
} from "@/components/layout/tab-nav-config";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function MoreMenuSheet({ open, onClose }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();
  const { selectedProjectId } = useSelectedProject();

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40 md:hidden"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border border-renovation-border bg-renovation-elevated p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg md:hidden dark:border-renovation-border dark:bg-renovation-elevated"
        role="dialog"
        aria-modal="true"
        aria-label={t("layout.bottomNav.more")}
      >
        <ul className="space-y-1">
          {MOBILE_MORE_TABS.map((item) => {
            const active = item.match(pathname);
            const href =
              item.labelKey === "nav.tabs.settings" && selectedProjectId
                ? `/dashboard/projects/${selectedProjectId}/settings`
                : appendProjectQuery(item.href, selectedProjectId);
            return (
              <li key={item.href}>
                <Link
                  href={href}
                  className={`block w-full ${tabNavLinkClass(active)}`}
                  onClick={onClose}
                >
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/dashboard/help"
              className={`block w-full ${tabNavLinkClass(pathname.startsWith("/dashboard/help"))}`}
              onClick={onClose}
            >
              {t("help.sidebarLink")}
            </Link>
          </li>
          <li>
            <Link
              href={
                selectedProjectId
                  ? `/dashboard/projects/${selectedProjectId}/settings?tab=account`
                  : "/dashboard/settings?tab=account"
              }
              className={`block w-full ${tabNavLinkClass(
                pathname.startsWith("/dashboard/settings") ||
                  (selectedProjectId != null &&
                    pathname.startsWith(`/dashboard/projects/${selectedProjectId}/settings`))
              )}`}
              onClick={onClose}
            >
              {t("nav.account")}
            </Link>
          </li>
        </ul>
      </div>
    </>
  );
}
