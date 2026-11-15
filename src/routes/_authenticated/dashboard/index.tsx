import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Camera, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DeltaBadge, KeyValue, Money, Pct, Section, StatCard, Tone } from "@/components/app/kpi";
import { Base100Chart, DonutChart } from "@/components/app/charts";
import { EmptyPortfolio, ErrorState, LoadingGrid, StaleNotice } from "@/components/app/states";
import { Tour } from "@/components/app/tour";
import { useAnalytics } from "@/lib/portfolio";
import { dividendsQuery } from "@/lib/market";
import { SECTOR_COLORS } from "@/lib/constants";
import { fmtDate, fmtDayMonth, fmtFCFA, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Vue d'ensemble — Kauri" }, { name: "description", content: "Ta performance BRVM nette en un coup d'œil." }] }),
  component: Dashboard,
});

const STEPS = [
  { target: '[data-tour="kpis"]', title: "Tes trois chiffres clés", body: "Valeur totale (titres + liquidité), gain total net et rendement annualisé depuis ta première opération." },
  { target: '[data-tour="patrimoine"]', title: "Apports et liquidité séparés", body: "Ici, ce que tu as versé est distingué de ce que tes titres valent. C'est la clé de ta vraie performance." },
  { target: '[data-tour="base100"]', title: "Indice base 100", body: "Ton portefeuille contre le BRVM Composite, dépôts et retraits neutralisés. L'écart en points dit si tu bats le marché." },
  { target: '[data-tour="periods"]', title: "Performance par période", body: "Aujourd'hui, cette semaine, ce mois… en FCFA et en %." },
];

function Dashboard() {
  const a = useAnalytics();
  const divQ = useQuery(dividendsQuery);

  const derived = useMemo(() => {
    if (!a.valuation || !a.holdings) return null;
    const v = a.valuation;
    const year = (a.lastClose ?? "").slice(0, 4);
    const divYear = a.txs.filter((t) => t.type === "dividende" && t.date.startsWith(year)).reduce((s, t) => s + t.amount - t.tax, 0);
    const held = new Map(v.positions.map((p) => [p.securityId, p.quantity]));
    const expected = (divQ.data ?? [])
      .filter((d) => a.lastClose && d.exDate > a.lastClose && held.has(d.securityId))
      .map((d) => ({ ...d, total: Math.round(d.amount * (held.get(d.securityId) ?? 0)) }));
    const sectors = new Map<string, number>();
    for (const p of v.positions) {
      const s = a.securities.get(p.securityId)?.sector ?? "Autre";
      sectors.set(s, (sectors.get(s) ?? 0) + p.value);
    }
    const sectorData = [...sectors.entries()].map(([name, value]) => ({ name, value, color: SECTOR_COLORS[name] ?? "var(--chart-7)" })).sort((x, y) => y.value - x.value);
    const ranked = [...v.positions].sort((x, y) => y.unrealizedPct - x.unrealizedPct);
    return {
      divYear,
      expected,
      expectedTotal: expected.reduce((s, d) => s + d.total, 0),
      sectorData,
      gainers: ranked.filter((p) => p.unrealized > 0).slice(0, 3),
      losers: ranked.filter((p) => p.unrealized < 0).reverse().slice(0, 3),
    };
  }, [a.valuation, a.holdings, a.txs, a.lastClose, a.securities, divQ.data]);

  if (a.error) return <ErrorState error={a.error} />;
  if (a.loading || !a.portfolio) return <LoadingGrid />;

  const header = <PageHeader eyebrow={`Clôture du ${fmtDayMonth(a.lastClose)}`} title="Vue d'ensemble" description={a.portfolio.name} />;

  if (a.txs.length === 0 || !a.valuation || !derived) {
    return (
      <>
        {header}
        <EmptyPortfolio />
      </>
    );
  }

  const v = a.valuation;
  const gainPct = v.netContributions > 0 ? v.gain / v.netContributions : 0;
  const tickerOf = (id: string) => a.securities.get(id)?.ticker ?? "?";

  return (
    <>
      {header}
      <StaleNotice lastClose={a.lastClose} />
      <Tour zone="dashboard" steps={STEPS} />

      <div className="grid gap-4 md:grid-cols-3" data-tour="kpis">
        <StatCard emphasis label="Valeur totale" icon={<Wallet className="h-4 w-4" />} value={fmtFCFA(v.totalValue)} sub={`Titres ${fmtFCFA(v.securitiesValue)} + liquidité ${fmtFCFA(v.cash)}`} />
        <StatCard
          label="Gain total"
          value={<Money value={v.gain} signed tone />}
          sub={
            <span className="flex items-center gap-2">
              <DeltaBadge value={gainPct} /> latent + réalisé + dividendes
            </span>
          }
        />
        <StatCard
          label="Rendement annualisé"
          value={<Pct value={a.annualized} />}
          sub={`Depuis le ${fmtDate(a.holdings?.firstDate)} (TRI)`}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Patrimoine" data-tour="patrimoine">
          <KeyValue label="Apports nets" hint="dépôts − retraits" value={fmtFCFA(v.netContributions)} />
          <KeyValue label="Valeur du portefeuille" hint="au dernier cours" value={fmtFCFA(v.securitiesValue)} />
          <KeyValue label="Capital investi" hint="frais inclus" value={fmtFCFA(v.investedCapital)} />
          <KeyValue label="Liquidité disponible" value={a.cashTracking ? fmtFCFA(v.cash) : "Suivi désactivé"} />
        </Section>
        <Section title="Performance">
          <KeyValue label="Plus-value latente" value={<Money value={v.unrealized} signed tone />} />
          <KeyValue label="Plus-value réalisée" value={<Money value={v.realized} signed tone />} />
          <KeyValue label="Dividendes nets perçus" value={<Money value={v.dividendsNet} signed tone />} />
          <KeyValue label="Frais cumulés" value={fmtFCFA(v.fees)} />
        </Section>
        <Section title="Revenus">
          <KeyValue label={`Dividendes perçus ${(a.lastClose ?? "").slice(0, 4)}`} hint="nets d'IRVM" value={<Money value={derived.divYear} tone signed />} />
          <KeyValue label="Dividendes attendus" hint="bruts, détachements à venir" value={fmtFCFA(derived.expectedTotal)} />
          {derived.expected.slice(0, 3).map((d) => (
            <div key={d.id} className="flex justify-between py-1 text-xs text-muted-foreground">
              <span>{tickerOf(d.securityId)} · détachement {fmtDate(d.exDate)}</span>
              <span className="tabular">{fmtFCFA(d.total)}</span>
            </div>
          ))}
        </Section>
      </div>

      <Section className="mt-4" title="Indice base 100" description="Mon portefeuille contre le BRVM Composite" data-tour="base100">
        <Base100Chart daily={a.daily} benchmark={a.benchmark} />
      </Section>

      <Section className="mt-4" title="Performance par période" data-tour="periods" actions={<Link to="/dashboard/portefeuille/gains-par-periode" className="text-sm font-semibold underline underline-offset-4">Détail</Link>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {a.periods.map((p) => (
            <div key={p.key} className="rounded-lg border bg-background p-3">
              <p className="text-xs text-muted-foreground">{p.label}</p>
              <p className="mt-1 font-semibold"><Money value={p.gain} signed tone /></p>
              <p className="text-sm"><Pct value={p.pct} /></p>
            </div>
          ))}
        </div>
      </Section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Mes top performances">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gain"><ArrowUpRight className="h-3.5 w-3.5" /> Hausses</p>
              {derived.gainers.length === 0 && <p className="text-sm text-muted-foreground">Aucune ligne en hausse.</p>}
              {derived.gainers.map((p) => (
                <div key={p.securityId} className="flex items-center justify-between border-b border-dashed py-2 last:border-0">
                  <span className="font-semibold">{tickerOf(p.securityId)}</span>
                  <span className="text-right text-sm"><Money value={p.unrealized} signed tone /><br /><Pct value={p.unrealizedPct} /></span>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-loss"><ArrowDownRight className="h-3.5 w-3.5" /> Baisses</p>
              {derived.losers.length === 0 && <p className="text-sm text-muted-foreground">Aucune ligne en baisse.</p>}
              {derived.losers.map((p) => (
                <div key={p.securityId} className="flex items-center justify-between border-b border-dashed py-2 last:border-0">
                  <span className="font-semibold">{tickerOf(p.securityId)}</span>
                  <span className="text-right text-sm"><Money value={p.unrealized} signed tone /><br /><Pct value={p.unrealizedPct} /></span>
                </div>
              ))}
            </div>
          </div>
        </Section>
        <Section title="Pondérations" description={`${v.positions.length} titre${v.positions.length > 1 ? "s" : ""} en portefeuille`}>
          <div className="grid items-center gap-4 sm:grid-cols-2">
            <DonutChart data={derived.sectorData} center={<><span className="text-xs text-muted-foreground">Secteurs</span><span className="font-display text-xl font-semibold">{derived.sectorData.length}</span></>} />
            <div className="space-y-1.5">
              {derived.sectorData.map((s) => (
                <div key={s.name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.name}</span>
                  <span className="tabular text-muted-foreground">{fmtPct(v.securitiesValue ? s.value / v.securitiesValue : 0, { decimals: 1 })}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 border-t pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top pondérations</p>
            {v.positions.slice(0, 5).map((p) => (
              <div key={p.securityId} className="mb-1.5 flex items-center gap-3 text-sm">
                <span className="w-14 font-semibold">{tickerOf(p.securityId)}</span>
                <div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${p.weight * 100}%` }} /></div>
                <span className="w-14 text-right tabular text-muted-foreground">{fmtPct(p.weight, { decimals: 1 })}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <Link to="/dashboard/a-une-date" className="mt-4 flex items-center justify-between rounded-xl border bg-card p-4 shadow-card transition-colors hover:bg-accent">
        <span className="flex items-center gap-3">
          <Camera className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-semibold">Photo du portefeuille à une date passée</span>
            <span className="text-sm text-muted-foreground">Retrouve la valeur, les positions et les gains à n'importe quelle date.</span>
          </span>
        </span>
        <Tone value={1}>→</Tone>
      </Link>
    </>
  );
}
