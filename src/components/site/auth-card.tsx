import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { db, DEMO_EMAIL, DEMO_PASSWORD } from "@/lib/local-db";
import { Logo } from "./logo";

export function safeRedirect(path: string | undefined | null): string {
  if (!path) return "/dashboard";
  try {
    const u = new URL(path, "http://x");
    if (path.startsWith("http")) {
      if (typeof window !== "undefined" && new URL(path).origin !== window.location.origin) return "/dashboard";
    } else if (!path.startsWith("/") || path.startsWith("//")) return "/dashboard";
    return u.pathname + u.search;
  } catch {
    return "/dashboard";
  }
}

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-ink-foreground lg:flex">
        <Link to="/" aria-label="Accueil">
          <Logo tone="light" />
        </Link>
        <div>
          <p className="font-display text-4xl font-bold leading-tight">
            Ton solde n'est pas
            <br />
            ta <span className="text-primary">performance.</span>
          </p>
          <p className="mt-4 max-w-md text-ink-muted">Gain net, rendement annualisé, indice base 100 contre le BRVM Composite. Gratuit, en FCFA, sans accès bancaire.</p>
        </div>
        <p className="text-xs text-ink-muted">Service indépendant, sans lien avec la BRVM.</p>
      </div>
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 inline-block lg:hidden" aria-label="Accueil">
            <Logo />
          </Link>
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

/** One-click access to the seeded demo account (data lives in this browser). */
export function SocialButtons({ onDone }: { redirectTo: string; onDone: () => void }) {
  async function go() {
    const { error } = await db.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (error) {
      toast.error("Le compte démo est indisponible. Réessaie.");
      return;
    }
    onDone();
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={go}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-primary/50 bg-gold-soft px-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary/20"
      >
        <Sparkles className="h-4 w-4" />
        Explorer avec le compte démo
      </button>
      <p className="text-center text-xs text-muted-foreground">
        {DEMO_EMAIL} · {DEMO_PASSWORD} — portefeuille d'exemple et accès au back-office.
      </p>
    </div>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> ou avec ton email <span className="h-px flex-1 bg-border" />
    </div>
  );
}
