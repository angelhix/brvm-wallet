import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive,
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  CalendarClock,
  FileText,
  Filter,
  FolderTree,
  Gift,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useIsAdmin, useProfile } from "@/hooks/use-auth";
import { usePortfolio } from "@/lib/portfolio";
import { indexSeriesQuery } from "@/lib/market";
import { APP_VERSION, DEMO_DATA_NOTICE } from "@/lib/constants";
import { fmtDayMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: string;
  exact?: boolean;
}

const NAV: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { to: "/rendez-vous", label: "Rendez-vous", icon: CalendarClock },
      { to: "/parrainage", label: "Parrainage", icon: Gift },
      { to: "/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Portefeuille",
    items: [
      { to: "/dashboard/portefeuille", label: "Titres", icon: Briefcase, exact: true },
      { to: "/dashboard/portefeuille/gains-par-periode", label: "Performance", icon: TrendingUp, match: "/dashboard/portefeuille/" },
      { to: "/dashboard/titres-cedes", label: "Titres cédés", icon: Archive },
      { to: "/dashboard/transactions", label: "Transactions", icon: ArrowLeftRight },
      { to: "/dashboard/sous-portefeuilles", label: "Sous-portefeuilles", icon: FolderTree },
    ],
  },
  {
    title: "Analyse",
    items: [
      { to: "/dashboard/analyse-globale", label: "Analyse globale", icon: BarChart3 },
      { to: "/dashboard/analyse", label: "Fiche titre", icon: FileText, exact: true },
      { to: "/dashboard/analyse/screener", label: "Screener", icon: Filter },
    ],
  },
  {
    items: [
      { to: "/aide", label: "Aide", icon: LifeBuoy },
      { to: "/dashboard/settings", label: "Paramètres", icon: Settings },
    ],
  },
];

function isActive(path: string, item: NavItem) {
  if (item.match) return path.startsWith(item.match);
  if (item.exact) return path === item.to || path === item.to + "/";
  return path === item.to || path.startsWith(item.to + "/");
}

function useSignOut() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    await qc.cancelQueries();
    qc.removeQueries({ predicate: (q) => q.queryKey[0] !== "market" });
    await supabase.auth.signOut();
    navigate({ to: "/login", search: { redirect: undefined }, replace: true });
  };
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { data: isAdmin } = useIsAdmin();
  const groups = isAdmin ? [...NAV, { title: "Administration", items: [{ to: "/admin", label: "Back-office", icon: ShieldCheck }] }] : NAV;
  return (
    <nav className="space-y-5" aria-label="Navigation de l'application">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title && <div className="mb-1.5 px-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-ink-muted">{g.title}</div>}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active = isActive(path, item);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const signOut = useSignOut();
  return (
    <div className="mt-6 border-t border-sidebar-border pt-4">
      <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>
      <p className="mt-3 px-3 text-xs text-ink-muted">Kauri v{APP_VERSION}</p>
    </div>
  );
}

function CloseBadge() {
  const qc = useQueryClient();
  const cal = useQuery(indexSeriesQuery("BRVMC"));
  const last = cal.data?.[cal.data.length - 1]?.date;
  async function refresh() {
    const key = "kauri.lastRefresh";
    const lastTs = Number(window.localStorage.getItem(key) ?? 0);
    const wait = 5 * 60_000 - (Date.now() - lastTs);
    if (wait > 0) {
      toast.info(`Cours déjà à jour. Prochaine actualisation possible dans ${Math.ceil(wait / 60000)} min.`);
      return;
    }
    window.localStorage.setItem(key, String(Date.now()));
    await qc.invalidateQueries({ queryKey: ["market"] });
    toast.success("Cours actualisés depuis la base.");
  }
  return (
    <button
      onClick={refresh}
      className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground sm:inline-flex"
      title="Actualiser les cours"
    >
      <RefreshCw className="h-3.5 w-3.5" />
      Clôture du {fmtDayMonth(last)}
    </button>
  );
}

function PortfolioSelect() {
  const { portfolios, portfolio, setPortfolioId } = usePortfolio();
  if (!portfolio) return null;
  return (
    <Select value={portfolio.id} onValueChange={setPortfolioId}>
      <SelectTrigger className="h-9 w-[170px] bg-card font-semibold sm:w-[220px]" aria-label="Compte-titres">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {portfolios.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const MOBILE_TABS: NavItem[] = [
  { to: "/dashboard", label: "Accueil", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/portefeuille", label: "Titres", icon: Briefcase, exact: true },
  { to: "/dashboard/transactions", label: "Opérations", icon: ArrowLeftRight },
  { to: "/dashboard/analyse-globale", label: "Marché", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const first = profile?.first_name || user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto bg-sidebar px-3 py-5 lg:flex">
        <Link to="/dashboard" className="mb-6 px-3">
          <Logo tone="light" />
        </Link>
        <NavList />
        <div className="flex-1" />
        <SidebarFooter />
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Link to="/dashboard" className="lg:hidden" aria-label="Accueil">
              <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
            </Link>
            <PortfolioSelect />
            <p className="hidden text-sm text-muted-foreground md:block">
              Bonjour, <span className="font-semibold text-foreground">{first}</span>
            </p>
            <div className="flex-1" />
            <CloseBadge />
            <Button asChild size="sm" className="hidden sm:inline-flex" data-tour="new-tx">
              <Link to="/dashboard/transactions/nouvelle">
                <Plus /> Nouvelle transaction
              </Link>
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden" aria-label="Ouvrir le menu">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 overflow-y-auto border-sidebar-border bg-sidebar p-4">
                <SheetHeader className="mb-4 p-0">
                  <SheetTitle>
                    <Logo tone="light" />
                  </SheetTitle>
                </SheetHeader>
                <NavList onNavigate={() => setOpen(false)} />
                <SidebarFooter />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
        <footer className="mx-auto hidden max-w-7xl px-6 pb-8 text-xs text-muted-foreground lg:block">
          {DEMO_DATA_NOTICE} Service indépendant, sans lien avec la BRVM.
        </footer>
      </div>

      {/* Mobile bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 backdrop-blur lg:hidden" aria-label="Navigation mobile">
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
          {MOBILE_TABS.slice(0, 2).map((t) => (
            <MobileTab key={t.to} item={t} active={isActive(path, t)} />
          ))}
          <Link
            to="/dashboard/transactions/nouvelle"
            className="mx-auto -mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift"
            aria-label="Nouvelle transaction"
          >
            <Plus className="h-6 w-6" />
          </Link>
          {MOBILE_TABS.slice(2).map((t) => (
            <MobileTab key={t.to} item={t} active={isActive(path, t)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link to={item.to} className={cn("flex flex-col items-center gap-0.5 py-1 text-[0.68rem]", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
      <Icon className={cn("h-5 w-5", active && "text-primary")} />
      {item.label}
    </Link>
  );
}
