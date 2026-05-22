"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import SettingsChangePasswordForm from "@/components/settings/SettingsChangePasswordForm";
import ThemePreferenceControl from "@/components/settings/ThemePreferenceControl";
import { useI18n } from "@/i18n/provider";
import { supabase } from "@/lib/supabase/client";

function settingsCard(children: ReactNode) {
  return (
    <div className="rounded-xl border border-renovation-border bg-renovation-elevated p-5 shadow-sm dark:border-renovation-border dark:bg-renovation-elevated">
      {children}
    </div>
  );
}

type Props = {
  /** Path to return to after password reset flow (without origin). */
  forgotReturnPath?: string;
};

export default function AccountSettingsContent({ forgotReturnPath = "/dashboard/settings" }: Props) {
  const { t } = useI18n();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const forgotHref = `/login/forgot?next=${encodeURIComponent(forgotReturnPath)}`;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
          {t("settings.sectionAppearance")}
        </h2>
        {settingsCard(
          <div className="space-y-3">
            <div className="text-base font-semibold text-foreground">{t("settings.themeLabel")}</div>
            <ThemePreferenceControl />
          </div>,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
          {t("settings.sectionAccount")}
        </h2>
        {settingsCard(
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-renovation-concrete">
                {t("settings.accountEmailLabel")}
              </div>
              <div className="mt-1 font-medium text-foreground">{user?.email ?? "—"}</div>
            </div>
            <Link
              href="/privacy"
              className="inline-flex font-medium text-renovation-steel underline-offset-2 hover:underline dark:text-renovation-accent"
            >
              {t("settings.accountPrivacyLink")}
            </Link>
          </div>,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
          {t("settings.sectionSecurity")}
        </h2>
        {settingsCard(
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">{t("settings.passwordChangeTitle")}</h3>
              <div className="mt-4">
                <SettingsChangePasswordForm />
              </div>
            </div>
            <div className="border-t border-renovation-border pt-6 dark:border-renovation-border">
              <h3 className="text-base font-semibold text-foreground">{t("settings.resetEmailTitle")}</h3>
              <p className="mt-1 text-sm text-renovation-concrete">{t("settings.resetEmailHint")}</p>
              <Link
                href={forgotHref}
                className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg border border-renovation-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-renovation-muted"
              >
                {t("settings.resetEmailButton")}
              </Link>
            </div>
          </div>,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
          {t("settings.sectionLanguage")}
        </h2>
        {settingsCard(
          <div className="space-y-1 text-sm">
            <div className="text-base font-semibold text-foreground">{t("settings.languageCurrent")}</div>
            <p className="text-renovation-concrete">{t("settings.languageHint")}</p>
          </div>,
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-renovation-steel">
          {t("settings.sectionData")}
        </h2>
        {settingsCard(
          <div className="space-y-4 text-sm">
            <p className="text-renovation-concrete">{t("settings.dataPrivacyIntro")}</p>
            <Link
              href="/privacy"
              className="inline-flex font-medium text-renovation-steel underline-offset-2 hover:underline dark:text-renovation-accent"
            >
              {t("settings.dataPrivacyCta")}
            </Link>
            <div className="rounded-lg border border-dashed border-renovation-border bg-renovation-muted/40 p-4 dark:border-renovation-border dark:bg-renovation-muted/40">
              <div className="font-medium text-foreground">{t("settings.dataComingTitle")}</div>
              <p className="mt-1 text-renovation-concrete">{t("settings.dataComingBody")}</p>
            </div>
          </div>,
        )}
      </section>
    </div>
  );
}
