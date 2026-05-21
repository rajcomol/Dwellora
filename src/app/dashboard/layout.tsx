import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import DashboardAppShell from "@/components/layout/DashboardAppShell";
import { SelectedProjectProvider } from "@/components/layout/SelectedProjectContext";
import GlobalChatLauncher from "@/components/dashboard/GlobalChatLauncher";
import { RenovationProvider } from "@/components/dashboard/RenovationProvider";
import { HelpProvider } from "@/components/help/HelpProvider";
import OnboardingTourClient from "@/components/help/OnboardingTourClient";
import nl from "@/i18n/locales/nl.json";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

export const metadata: Metadata = {
  title: nl.meta.dashboardTitle,
  description: nl.meta.dashboardDescription,
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    redirect("/login?next=/dashboard");
  }

  return (
    <HelpProvider>
      <RenovationProvider>
        <Suspense fallback={null}>
          <SelectedProjectProvider>
            <DashboardAppShell>
              {children}
              <GlobalChatLauncher />
              <OnboardingTourClient />
            </DashboardAppShell>
          </SelectedProjectProvider>
        </Suspense>
      </RenovationProvider>
    </HelpProvider>
  );
}
