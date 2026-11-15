import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import "@lovable.dev/cloud-auth-js/styles.css";
import { lovable } from "@/integrations/lovable/index";
import { Logo } from "./logo";

export const POST_AUTH_KEY = "kauri.postAuth";

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

const GoogleG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z" />
  </svg>
);

export function SocialButtons({ redirectTo, onDone }: { redirectTo: string; onDone: () => void }) {
  async function go(provider: "google" | "lovable") {
    window.sessionStorage.setItem(POST_AUTH_KEY, redirectTo);
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error("La connexion n'a pas abouti. Réessaie.");
      return;
    }
    if (result.redirected) return;
    window.sessionStorage.removeItem(POST_AUTH_KEY);
    onDone();
  }
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => go("google")}
        className="flex h-10 w-full items-center justify-center gap-2.5 rounded-md border px-3 text-sm font-medium"
        style={{ background: "#FFFFFF", borderColor: "#747775", color: "#1F1F1F" }}
      >
        <GoogleG />
        Continuer avec Google
      </button>
      <button type="button" className="lovable-auth-button w-full" onClick={() => go("lovable")}>
        Continuer avec Lovable
      </button>
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
