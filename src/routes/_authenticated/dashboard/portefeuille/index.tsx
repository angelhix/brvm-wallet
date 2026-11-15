import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Money, Pct, Section, Tone } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { EmptyPortfolio, ErrorState, LoadingGrid, StaleNotice } from "@/components/app/states";
import { Tour } from "@/components/app/tour";
import { useAnalytics } from "@/lib/portfolio";
import { dayDiff } from "@/lib/engine";
import { fmtDate, fmtFCFA, fmtNum, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/portefeuille/")({
  head: () => ({ meta: [{ title: "Titres — Kauri" }, { name: "description", content: "Tes positions BRVM, prix de revient et plus-values latentes." }] }),
  component: Titres,
});

const STEPS = [
  { target: '[data-tour="positions"]', title: "Tes positions", body: "Prix de revient frais inclus, dernier cours, plus-value latente et durée de détention de chaque ligne." },
  { target: '[data-tour="update"]', title: "Fraîcheur des cours", body: "Les cours sont mis à jour chaque jour de cotation après la clôture." },
];

function since(iso: string | null) {
  if (!iso) return "—";
  const days = Math.max(0, Math.round((Date.now() - Date.parse(iso + "T18:00:00Z")) / 86400000));
  return days === 0 ? "aujourd'hui" : days === 1 ? "hier" : `${days} jours`;
}

function Titres() {
  const a = useAnalytics();
  if (a.error) return <ErrorState error={a.error} />;
  if (a.loading || !a.portfolio) return <LoadingGrid />;
  const header = <PageHeader eyebrow="Portefeuille" title="Titres" description={a.portfolio.name} />;
  if (!a.valuation || a.txs.length === 0) return (<>{header}<EmptyPortfolio /></>);
  const v = a.valuation;
  const sec = (id: string) => a.securities.get(id);
  const totDiv = v.positions.reduce((s, p) => s + p.dividends, 0);
  const prev = (id: string) => sec(id)?.change ?? null;

  return (
    <>
      {header}
      <StaleNotice lastClose={a.lastClose} />
      <Tour zone="portefeuille" steps={STEPS} />
      <p data-tour="update" className="mb-4 text-sm text-muted-foreground">
        Cours du {fmtDate(a.lastClose)} · mis à jour il y a {since(a.lastClose)}, prochaine mise à jour au prochain jour de cotation à 18:00.
      </p>
      <Section title={`${v.positions.length} ligne${v.positions.length > 1 ? "s" : ""}`} description={`Liquidité disponible : ${fmtFCFA(v.cash)}`} data-tour="positions">
        <DataTable
          rows={v.positions}
          rowKey={(p) => p.securityId}
          columns={[
            { key: "t", header: "Titre", cell: (p) => (
              <Link to="/dashboard/analyse" search={{ ticker: sec(p.securityId)?.ticker }} className="block">
                <span className="font-semibold">{sec(p.securityId)?.ticker}</span>
                <span className="block max-w-[14rem] truncate text-xs text-muted-foreground">{sec(p.securityId)?.name}</span>
              </Link>
            ) },
            { key: "q", header: "Qté", align: "right", cell: (p) => fmtNum(p.quantity) },
            { key: "pru", header: "PRU", align: "right", cell: (p) => fmtNum(p.unitCost) },
            { key: "inv", header: "Investi", align: "right", cell: (p) => fmtNum(p.cost) },
            { key: "last", header: "Cours", align: "right", cell: (p) => (<>{fmtNum(p.lastPrice)}<span className="block text-xs"><Pct value={prev(p.securityId)} /></span></>) },
            { key: "pv", header: "+/- value", align: "right", cell: (p) => (<><Tone value={p.unrealized}>{fmtFCFA(p.unrealized, { signed: true })}</Tone><span className="block text-xs"><Pct value={p.unrealizedPct} /></span></>) },
            { key: "div", header: "Dividendes", align: "right", cell: (p) => fmtNum(p.dividends) },
            { key: "w", header: "Poids", align: "right", cell: (p) => fmtPct(p.weight, { decimals: 1 }) },
            { key: "val", header: "Valeur", align: "right", cell: (p) => <span className="font-semibold">{fmtNum(p.value)}</span> },
            { key: "d", header: "Détention", align: "right", cell: (p) => (p.openedOn && a.asOf ? `${dayDiff(p.openedOn, a.asOf)} j` : "—") },
          ]}
          footer={
            <tr>
              <td className="px-3 py-2.5">Total</td>
              <td colSpan={2} />
              <td className="px-3 py-2.5 text-right tabular">{fmtNum(v.investedCapital)}</td>
              <td />
              <td className="px-3 py-2.5 text-right"><Money value={v.unrealized} signed tone /></td>
              <td className="px-3 py-2.5 text-right tabular">{fmtNum(totDiv)}</td>
              <td className="px-3 py-2.5 text-right tabular">100 %</td>
              <td className="px-3 py-2.5 text-right tabular">{fmtNum(v.securitiesValue)}</td>
              <td />
            </tr>
          }
        />
      </Section>
    </>
  );
}
