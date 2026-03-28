import type { Metadata } from "next";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { RenovationProvider } from "@/components/dashboard/RenovationProvider";
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
    <DashboardShell>
      <RenovationProvider>{children}</RenovationProvider>
    </DashboardShell>
  );
}

