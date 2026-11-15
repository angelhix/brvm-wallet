import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Money, Pct, Section, StatCard, Tone } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { EmptyPortfolio, ErrorState, LoadingGrid } from "@/components/app/states";
import { useAnalytics } from "@/lib/portfolio";
import { fmtDate, fmtFCFA, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/titres-cedes")({
  head: () => ({ meta: [{ title: "Titres cédés — Kauri" }, { name: "description", content: "Positions clôturées et plus-values réalisées." }] }),
  component: TitresCedes,
});

function TitresCedes() {
  const a = useAnalytics();
  if (a.error) return <ErrorState error={a.error} />;
  if (a.loading || !a.portfolio) return <LoadingGrid />;
  const header = <PageHeader eyebrow="Portefeuille" title="Titres cédés" description="Chaque vente avec son prix de revient, son prix de cession et la plus-value réalisée." />;
  if (!a.holdings || a.txs.length === 0) return (<>{header}<EmptyPortfolio /></>);
  const lots = [...a.holdings.closedLots].sort((x, y) => y.date.localeCompare(x.date));
  const total = lots.reduce((s, l) => s + l.gain, 0);
  const proceeds = lots.reduce((s, l) => s + l.proceeds, 0);
  const sec = (id: string) => a.securities.get(id);
  return (
    <>
      {header}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard emphasis label="Plus-value réalisée" value={<Tone value={total}>{fmtFCFA(total, { signed: true })}</Tone>} />
        <StatCard label="Produit des cessions" value={fmtFCFA(proceeds)} sub="net de frais" />
        <StatCard label="Cessions" value={fmtNum(lots.length)} />
      </div>
      <Section title="Historique des cessions">
        <DataTable
          rows={lots}
          rowKey={(l) => l.txId}
          empty="Tu n'as encore cédé aucun titre."
          columns={[
            { key: "d", header: "Date", cell: (l) => fmtDate(l.date) },
            { key: "t", header: "Titre", cell: (l) => <span className="font-semibold">{sec(l.securityId)?.ticker}</span> },
            { key: "q", header: "Qté", align: "right", cell: (l) => fmtNum(l.quantity) },
            { key: "pru", header: "PRU", align: "right", cell: (l) => fmtNum(l.costBasis / l.quantity) },
            { key: "pc", header: "Prix cession net", align: "right", cell: (l) => fmtNum(l.proceeds / l.quantity) },
            { key: "pv", header: "Plus-value", align: "right", cell: (l) => (<><Money value={l.gain} signed tone className="font-semibold" /><span className="block text-xs"><Pct value={l.costBasis ? l.gain / l.costBasis : 0} /></span></>) },
            { key: "h", header: "Détenu depuis", align: "right", cell: (l) => fmtDate(l.openedOn) },
          ]}
        />
      </Section>
    </>
  );
}
