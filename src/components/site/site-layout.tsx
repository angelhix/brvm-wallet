import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "./logo";
import { TickerTape } from "./ticker-tape";
import { useAuth } from "@/hooks/use-auth";
import { DISCLAIMER } from "@/lib/constants";

const ANCHORS = [
  { href: "/#probleme", label: "Le problème" },
  { href: "/#solution", label: "La solution" },
  { href: "/#etapes", label: "Comment ça marche" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40">
      <TickerTape />
      <div className="border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link to="/" aria-label="Kauri, accueil">
            <Logo />
          </Link>
          <nav className="hidden flex-1 items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Sections">
            {ANCHORS.map((a) => (
              <a key={a.href} href={a.href} className="hover:text-foreground">
                {a.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto hidden items-center gap-2 md:flex">
            {user ? (
              <Button asChild>
                <Link to="/dashboard">Mon tableau de bord</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login" search={{ redirect: undefined }}>
                    Connexion
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/signup" search={{ ref: undefined }}>
                    Voir ma vraie rentabilité
                  </Link>
                </Button>
              </>
            )}
          </div>
          <button className="ml-auto rounded-md p-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t px-4 pb-4 md:hidden">
            <nav className="flex flex-col py-2" aria-label="Sections">
              {ANCHORS.map((a) => (
                <a key={a.href} href={a.href} onClick={() => setOpen(false)} className="py-2 text-sm">
                  {a.label}
                </a>
              ))}
            </nav>
            {user ? (
              <Button asChild className="w-full">
                <Link to="/dashboard">Mon tableau de bord</Link>
              </Button>
            ) : (
              <div className="grid gap-2">
                <Button asChild variant="outline">
                  <Link to="/login" search={{ redirect: undefined }}>
                    Connexion
                  </Link>
                </Button>
                <Button asChild>
                  <Link to="/signup" search={{ ref: undefined }}>
                    Voir ma vraie rentabilité
                  </Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-ink text-ink-foreground">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-4 max-w-sm text-sm text-ink-muted">
            Le suivi de portefeuille BRVM qui sépare ta trésorerie de tes actions. Gratuit, en FCFA, sans accès bancaire.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Produit</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li><a href="/#solution" className="hover:text-ink-foreground">Fonctionnalités</a></li>
            <li><Link to="/securite" className="hover:text-ink-foreground">Sécurité</Link></li>
            <li><Link to="/aide" className="hover:text-ink-foreground">Aide</Link></li>
            <li><Link to="/contact" className="hover:text-ink-foreground">Contact</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Légal</h3>
          <ul className="mt-3 space-y-2 text-sm text-ink-muted">
            <li><Link to="/legal" className="hover:text-ink-foreground">Mentions légales</Link></li>
            <li><Link to="/privacy" className="hover:text-ink-foreground">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sidebar-border">
        <p className="mx-auto max-w-6xl px-4 py-6 text-xs leading-relaxed text-ink-muted sm:px-6">
          {DISCLAIMER} © {new Date().getFullYear()} Kauri.
        </p>
      </div>
    </footer>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function ProsePage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <SiteLayout>
      <div className="border-b bg-grain">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{eyebrow}</p>
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl">{title}</h1>
          {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 text-[0.97rem] leading-relaxed sm:px-6 [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted-foreground [&_ul]:space-y-2 [&_ul]:text-muted-foreground">
        {children}
      </div>
    </SiteLayout>
  );
}
