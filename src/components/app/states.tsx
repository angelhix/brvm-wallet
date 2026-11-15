import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Plus, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortfolio, useSecurityLookup, txQueryKey } from "@/lib/portfolio";

export function LoadingGrid({ cards = 3, rows = 2 }: { cards?: number; rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Chargement">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-64 rounded-xl" />
      ))}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-loss-soft p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <div>
        <p className="font-semibold">Impossible de charger ces données.</p>
        <p className="text-muted-foreground">{error instanceof Error ? error.message : "Réessaie dans un instant."}</p>
      </div>
    </div>
  );
}

export function EmptyPortfolio() {
  const { portfolio } = usePortfolio();
  const { rows } = useSecurityLookup();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  async function loadDemo() {
    if (!portfolio) return;
    const unlc = rows.find((r) => r.ticker === "UNLC");
    const palc = rows.find((r) => r.ticker === "PALC");
    if (!unlc || !palc) return;
    setBusy(true);
    const base = { portfolio_id: portfolio.id, note: "Exemple", source: "saisie" };
    const { error } = await supabase.from("transactions").insert([
      { ...base, type: "depot" as const, date: "2026-07-10", amount: 1_000_000 },
      { ...base, type: "acquisition" as const, date: "2026-07-10", security_id: unlc.securityId, quantity: 10, price: 50_500, fees: 505 },
      { ...base, type: "acquisition" as const, date: "2026-07-10", security_id: palc.securityId, quantity: 11, price: 8_000, fees: 448 },
      { ...base, type: "depot" as const, date: "2026-08-03", amount: 10_000 },
    ]);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Exemple chargé : tu peux le supprimer à tout moment dans Transactions.");
    qc.invalidateQueries({ queryKey: txQueryKey(portfolio.id) });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-6 shadow-card sm:p-10">
      <div className="absolute inset-0 bg-grain opacity-60" aria-hidden="true" />
      <div className="relative max-w-xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" /> Première étape
        </span>
        <h2 className="mt-4 text-2xl font-bold sm:text-3xl">Saisis ta première transaction</h2>
        <p className="mt-2 text-muted-foreground">
          Commence par ton dépôt sur le compte-titres, puis tes achats. Kauri sépare automatiquement ta trésorerie et tes actions
          pour te montrer ta vraie performance.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link to="/dashboard/transactions/nouvelle">
              <Plus /> Nouvelle transaction
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard/transactions/import">
              <Upload /> Importer un relevé
            </Link>
          </Button>
          <Button variant="ghost" size="lg" onClick={loadDemo} disabled={busy}>
            Charger un exemple
          </Button>
        </div>
      </div>
    </div>
  );
}

export function StaleNotice({ lastClose }: { lastClose: string | null }) {
  if (!lastClose) return null;
  const ageDays = (Date.now() - Date.parse(lastClose + "T18:00:00Z")) / 86400000;
  if (ageDays < 4) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/40 bg-gold-soft px-3 py-2 text-sm">
      <AlertTriangle className="h-4 w-4" />
      Les cours affichés datent de la dernière séance connue. La mise à jour a pris du retard.
    </div>
  );
}
