import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { KeyValue, Money, Section, StatCard, Tone } from "@/components/app/kpi";
import { GainBarChart, PeriodTabs } from "@/components/app/charts";
import { DataTable } from "@/components/app/data-table";
import { EmptyPortfolio, ErrorState, LoadingGrid } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { useAnalytics } from "@/lib/portfolio";
import { dailyGains, gainStats, securityGains } from "@/lib/engine";
import { fmtDate, fmtDayMonth, fmtFCFA, fmtNum, MONTH_SHORT, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PerfView = "portefeuille" | "titres" | "apports";
type Mode = "month" | "year";

const VIEWS: { key: PerfView; label: string; to: string }[] = [
  { key: "portefeuille", label: "Portefeuille", to: "/dashboard/portefeuille/gains-par-periode" },
  { key: "titres", label: "Par titre", to: "/dashboard/portefeuille/performance-titres" },
  { key: "apports", label: "Apports", to: "/dashboard/portefeuille/apports-et-plus-value" },
];

function shiftPeriod(key: string, mode: Mode, delta: number) {
  if (mode === "year") return String(Number(key) + delta);
  const [y, m] = key.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function PerformanceScreen({ view }: { view: PerfView }) {
  const a = useAnalytics();
  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState<string | null>(null);
  const last = a.lastClose ?? "";
  const key = cursor ?? (mode === "year" ? last.slice(0, 4) : last.slice(0, 7));
  const first = a.daily[0]?.date ?? last;
  const minKey = mode === "year" ? first.slice(0, 4) : first.slice(0, 7);
  const maxKey = mode === "year" ? last.slice(0, 4) : last.slice(0, 7);

  const data = useMemo(() => {
    const days = dailyGains(a.daily).filter((d) => d.date.startsWith(key));
    const pts = a.daily.filter((d) => d.date.startsWith(key));
    const before = a.daily.filter((d) => d.date < key + (mode === "year" ? "-01-01" : "-01"));
    const fromDate = before.length ? before[before.length - 1]!.date : null;
    const toDate = pts.length ? pts[pts.length - 1]!.date : null;
    const bars =
      mode === "month"
        ? days.map((d) => ({ key: d.date, gain: d.gain }))
        : Array.from({ length: 12 }, (_, m) => {
            const mk = `${key}-${String(m + 1).padStart(2, "0")}`;
            return { key: mk, gain: days.filter((d) => d.date.startsWith(mk)).reduce((s, d) => s + d.gain, 0) };
          }).filter((b) => b.key >= minKey.slice(0, 7) && b.key <= last.slice(0, 7));
    const bySec = toDate ? securityGains(a.txs, a.prices, fromDate, toDate, a.cashTracking) : [];
    return { days, stats: gainStats(days), bars, bySec, start: before[before.length - 1] ?? null, end: pts[pts.length - 1] ?? null };
  }, [a.daily, a.txs, a.prices, a.cashTracking, key, mode, minKey, last]);

  if (a.error) return <ErrorState error={a.error} />;
  if (a.loading || !a.portfolio) return <LoadingGrid />;
  const header = <PageHeader eyebrow="Performance" title="Gains par période" description={a.portfolio.name} />;
  if (a.txs.length === 0 || a.daily.length === 0) return (<>{header}<EmptyPortfolio /></>);

  const label = mode === "year" ? key : monthLabel(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1);
  const sec = (id: string) => a.securities.get(id);
  const s = data.stats;

  return (
    <>
      {header}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <nav className="inline-flex rounded-lg border bg-secondary p-0.5" aria-label="Vues de performance">
          {VIEWS.map((v) => (
            <Link key={v.key} to={v.to} className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", view === v.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {v.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <PeriodTabs value={mode} onChange={(m) => { setMode(m); setCursor(null); }} options={[{ key: "month", label: "Mois" }, { key: "year", label: "Année" }] as const} />
          <Button variant="outline" size="icon" aria-label="Période précédente" disabled={key <= minKey} onClick={() => setCursor(shiftPeriod(key, mode, -1))}><ChevronLeft /></Button>
          <span className="min-w-[8.5rem] text-center text-sm font-semibold capitalize">{label}</span>
          <Button variant="outline" size="icon" aria-label="Période suivante" disabled={key >= maxKey} onClick={() => setCursor(shiftPeriod(key, mode, 1))}><ChevronRight /></Button>
        </div>
      </div>

      {view === "portefeuille" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard emphasis label="Gain net de la période" value={<Tone value={s?.total}>{fmtFCFA(s?.total, { signed: true })}</Tone>} sub={`${s?.count ?? 0} séances`} />
            <StatCard label="Meilleur jour" value={<Tone value={s?.best.gain}>{fmtFCFA(s?.best.gain, { signed: true })}</Tone>} sub={s ? fmtDate(s.best.date) : "—"} />
            <StatCard label="Pire jour" value={<Tone value={s?.worst.gain}>{fmtFCFA(s?.worst.gain, { signed: true })}</Tone>} sub={s ? fmtDate(s.worst.date) : "—"} />
            <StatCard label="Moyenne par jour" value={<Tone value={s?.average}>{fmtFCFA(s?.average, { signed: true })}</Tone>} sub={`${s?.positive ?? 0} jours positifs · ${s?.negative ?? 0} négatifs`} />
          </div>
          <Section title={mode === "month" ? "Gain net par jour" : "Gain net par mois"}>
            {data.bars.length ? (
              <GainBarChart data={data.bars} labelFormatter={mode === "month" ? fmtDayMonth : (k) => MONTH_SHORT[Number(k.slice(5, 7)) - 1] ?? k} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Aucune séance sur cette période.</p>
            )}
          </Section>
        </div>
      )}

      {view === "titres" && (
        <Section title="Gains par titre" description="Variation de valeur + ventes + dividendes − achats sur la période.">
          <DataTable
            rows={data.bySec}
            rowKey={(r) => r.securityId}
            empty="Aucun titre détenu sur cette période."
            columns={[
              { key: "t", header: "Titre", cell: (r) => <span className="font-semibold">{sec(r.securityId)?.ticker}</span> },
              { key: "s", header: "Valeur début", align: "right", cell: (r) => fmtNum(r.startValue) },
              { key: "f", header: "Flux nets", align: "right", cell: (r) => fmtNum(r.netFlows) },
              { key: "e", header: "Valeur fin", align: "right", cell: (r) => fmtNum(r.endValue) },
              { key: "g", header: "Gain", align: "right", cell: (r) => <Money value={r.gain} signed tone className="font-semibold" /> },
            ]}
          />
        </Section>
      )}

      {view === "apports" && data.end && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Apports contre plus-value" description={`Au ${fmtDate(data.end.date)}`}>
            <KeyValue label="Apports nets cumulés" value={fmtFCFA(data.end.contributions)} />
            <KeyValue label="Valeur totale" value={fmtFCFA(data.end.value)} />
            <KeyValue label="Plus-value totale" value={<Money value={data.end.gain} signed tone />} />
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-secondary" aria-hidden="true">
              <div className="h-full bg-primary" style={{ width: `${Math.min(100, (data.end.contributions / Math.max(data.end.value, data.end.contributions, 1)) * 100)}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Part de la valeur totale venant de tes apports.</p>
          </Section>
          <Section title="Sur la période" description={label}>
            <KeyValue label="Apports de la période" value={fmtFCFA(data.end.contributions - (data.start?.contributions ?? 0), { signed: true })} />
            <KeyValue label="Plus-value de la période" value={<Money value={data.end.gain - (data.start?.gain ?? 0)} signed tone />} />
            <KeyValue label="Variation de la valeur" value={fmtFCFA(data.end.value - (data.start?.value ?? 0), { signed: true })} />
          </Section>
        </div>
      )}
    </>
  );
}
