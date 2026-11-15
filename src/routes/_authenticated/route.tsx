import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { db as supabase } from "@/lib/local-db";
import { AppShell } from "@/components/app/app-shell";
import { PortfolioProvider } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <PortfolioProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </PortfolioProvider>
  );
}
