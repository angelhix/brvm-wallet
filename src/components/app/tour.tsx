import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db as supabase } from "@/lib/local-db";
import { useAuth } from "@/hooks/use-auth";

export interface TourStep {
  target: string; // CSS selector, e.g. [data-tour="kpis"]
  title: string;
  body: string;
}

export const TOUR_ZONES = [
  { zone: "dashboard", label: "Tableau de bord", path: "/dashboard" },
  { zone: "portefeuille", label: "Portefeuille", path: "/dashboard/portefeuille" },
  { zone: "fiche", label: "Fiche titre", path: "/dashboard/analyse" },
  { zone: "screener", label: "Screener", path: "/dashboard/analyse/screener" },
  { zone: "sous-portefeuilles", label: "Sous-portefeuilles", path: "/dashboard/sous-portefeuilles" },
  { zone: "transactions", label: "Imports et exports", path: "/dashboard/transactions" },
] as const;

/** Launches once per zone automatically; `?revoir-tour=<zone>` replays it. */
export function Tour({ zone, steps, ready = true }: { zone: string; steps: TourStep[]; ready?: boolean }) {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!user || !ready) return;
    let cancelled = false;
    const forced = new URLSearchParams(window.location.search).get("revoir-tour") === zone;
    const t = window.setTimeout(async () => {
      if (forced) {
        if (!cancelled) setActive(true);
        return;
      }
      const { data } = await supabase.from("tour_progress").select("zone").eq("zone", zone).maybeSingle();
      if (!cancelled && !data) setActive(true);
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [user, zone, ready]);

  const step = steps[i];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (!active || !step) return;
    const el = document.querySelector(step.target);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, step, measure]);

  async function finish() {
    setActive(false);
    setI(0);
    if (user) await supabase.from("tour_progress").upsert({ user_id: user.id, zone, seen_at: new Date().toISOString() });
    const url = new URL(window.location.href);
    if (url.searchParams.has("revoir-tour")) {
      url.searchParams.delete("revoir-tour");
      window.history.replaceState(null, "", url.toString());
    }
  }

  if (!active || !step || typeof document === "undefined") return null;

  const pad = 8;
  const cardTop = rect ? (rect.bottom + 180 < window.innerHeight ? rect.bottom + pad + 8 : Math.max(12, rect.top - 190)) : window.innerHeight / 2 - 90;
  const cardLeft = rect ? Math.min(Math.max(12, rect.left), window.innerWidth - 340) : window.innerWidth / 2 - 160;

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={`Visite guidée : ${step.title}`}>
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px color-mix(in oklab, var(--ink) 60%, transparent)",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: "color-mix(in oklab, var(--ink) 60%, transparent)" }} />
      )}
      <div className="absolute w-[320px] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lift" style={{ top: cardTop, left: cardLeft }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Visite guidée · {i + 1}/{steps.length}
          </p>
          <button onClick={finish} className="rounded p-1 text-muted-foreground hover:bg-muted" aria-label="Fermer la visite">
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={finish}>
            Passer
          </Button>
          <div className="flex gap-2">
            {i > 0 && (
              <Button variant="outline" size="sm" onClick={() => setI(i - 1)}>
                Retour
              </Button>
            )}
            <Button size="sm" onClick={() => (i + 1 < steps.length ? setI(i + 1) : finish())}>
              {i + 1 < steps.length ? "Suivant" : "Terminer"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
