import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { KeyValue, Money, Pct, Section, StatCard, Tone } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { EmptyPortfolio, ErrorState, LoadingGrid } from "@/components/app/states";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAnalytics } from "@/lib/portfolio";
import { fmtDate, fmtFCFA, fmtNum, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/a-une-date")({
  head: () => ({ meta: [{ title: "Photo à une date — Kauri" }, { name: "description", content: "L'état de ton portefeuille à une date passée." }] }),
  component: AUneDate,
});

function AUneDate() {
  const base = useAnalytics();
  const [date, setDate] = useState<string>("");
  const chosen = date || base.lastClose || "";
  // Snap to the last trading session on or before the chosen day.
  const session = [...base.calendar].reverse().find((d) => d <= chosen) ?? null;
  const a = useAnalytics({ asOf: session });

  if (a.error || base.error) return <ErrorState error={a.error || base.error} />;
  if (a.loading || base.loading || !a.portfolio) return <LoadingGrid />;
  const header = <PageHeader eyebrow="Portefeuille" title="Photo à une date passée" description="Reconstitue la valeur, les positions et les gains au soir d'une séance." />;
  if (base.txs.length === 0) return (<>{header}<EmptyPortfolio /></>);
  const v = a.valuation;
  const sec = (id: string) => a.securities.get(id);
  const first = base.holdings?.firstDate ?? "";

  return (
    <>
      {header}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="asof">Date</Label>
          <Input id="asof" type="date" className="w-48" min={first} max={base.lastClose ?? undefined} value={chosen} onChange={(e) => setDate(e.target.value)} />
        </div>
        <p className="pb-2 text-sm text-muted-foreground">Séance retenue : {fmtDate(session)}</p>
      </div>
      {!v || (session && session < first) ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Ton portefeuille n'existait pas encore à cette date (première opération le {fmtDate(first)}).</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard emphasis label="Valeur totale" value={fmtFCFA(v.totalValue)} />
            <StatCard label="Gain total" value={<Tone value={v.gain}>{fmtFCFA(v.gain, { signed: true })}</Tone>} sub={<Pct value={v.netContributions ? v.gain / v.netContributions : 0} />} />
            <StatCard label="Rendement annualisé" value={<Pct value={a.annualized} />} />
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Patrimoine">
              <KeyValue label="Apports nets" value={fmtFCFA(v.netContributions)} />
              <KeyValue label="Valeur des titres" value={fmtFCFA(v.securitiesValue)} />
              <KeyValue label="Capital investi" value={fmtFCFA(v.investedCapital)} />
              <KeyValue label="Liquidité" value={fmtFCFA(v.cash)} />
              <KeyValue label="Plus-value latente" value={<Money value={v.unrealized} signed tone />} />
              <KeyValue label="Plus-value réalisée" value={<Money value={v.realized} signed tone />} />
              <KeyValue label="Dividendes nets" value={fmtFCFA(v.dividendsNet)} />
            </Section>
            <Section title="Positions" className="lg:col-span-2">
              <DataTable
                rows={v.positions}
                rowKey={(p) => p.securityId}
                empty="Aucune position à cette date."
                columns={[
                  { key: "t", header: "Titre", cell: (p) => <span className="font-semibold">{sec(p.securityId)?.ticker}</span> },
                  { key: "q", header: "Qté", align: "right", cell: (p) => fmtNum(p.quantity) },
                  { key: "pru", header: "PRU", align: "right", cell: (p) => fmtNum(p.unitCost) },
                  { key: "c", header: "Cours", align: "right", cell: (p) => fmtNum(p.lastPrice) },
                  { key: "pv", header: "+/- value", align: "right", cell: (p) => <Money value={p.unrealized} signed tone /> },
                  { key: "w", header: "Poids", align: "right", cell: (p) => fmtPct(p.weight, { decimals: 1 }) },
                  { key: "v", header: "Valeur", align: "right", cell: (p) => fmtNum(p.value) },
                ]}
              />
            </Section>
          </div>
        </div>
      )}
    </>
  );
}
