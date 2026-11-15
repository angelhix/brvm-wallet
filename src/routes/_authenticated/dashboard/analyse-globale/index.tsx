import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, CalendarDays, ExternalLink } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/app/page-header";
import { DeltaBadge, KeyValue, Money, Pct, Section, StatCard } from "@/components/app/kpi";
import { DataTable, type Column } from "@/components/app/data-table";
import { PeriodTabs, PriceLineChart } from "@/components/app/charts";
import { ErrorState, LoadingGrid } from "@/components/app/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allIndicesLatestQuery, securityHistoryQuery } from "@/lib/market";
import { shiftDays, useUniverse, type UniverseRow } from "@/lib/market-analytics";
import { INDEX_LABELS, SECTOR_COLORS, SECTORS } from "@/lib/constants";
import { fmtDate, fmtFCFA, fmtNum, fmtPct } from "@/lib/format";
import { useAnalytics } from "@/lib/portfolio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/analyse-globale/")({
  head: () => ({
    meta: [
      { title: "Analyse globale — Kauri" },
      { name: "description", content: "Palmarès des hausses et baisses, ordres résiduels, volumes, analyse par titre et calendrier des dividendes de la BRVM." },
    ],
  }),
  component: AnalyseGlobale,
});

type Period = "1J" | "1S" | "1M" | "YTD" | "1A";
const PERIODS = [
  { key: "1J", label: "Jour" },
  { key: "1S", label: "1 sem." },
  { key: "1M", label: "1 mois" },
  { key: "YTD", label: "Depuis janv." },
  { key: "1A", label: "1 an" },
] as const;
const pick = (r: UniverseRow, p: Period) => (p === "1J" ? r.change : p === "1S" ? r.ch1w : p === "1M" ? r.ch1m : p === "YTD" ? r.chYtd : r.ch1y);

const tooltipStyle = { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12, color: "var(--popover-foreground)" };

function AnalyseGlobale() {
  const u = useUniverse();
  const idx = useQuery(allIndicesLatestQuery);
  const [tab, setTab] = useState("variations");
  const [focus, setFocus] = useState<string>("");

  if (u.error) return <ErrorState error={u.error} />;
  if (u.loading) return <LoadingGrid cards={3} rows={2} />;

  return (
    <>
      <PageHeader eyebrow="Analyse" title="Analyse globale" description={`Séance du ${fmtDate(u.lastDate)} · ${u.rows.length} sociétés cotées`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {(["BRVMC", "BRVM30", "BRVMPR"] as const).map((code) => {
          const v = idx.data?.[code];
          const ch = v && v.prev ? v.value / v.prev - 1 : null;
          return (
            <StatCard key={code} label={INDEX_LABELS[code]} value={v ? fmtNum(v.value, 2) : "—"} emphasis={code === "BRVMC"}>
              <div className="mt-1"><DeltaBadge value={ch} /></div>
            </StatCard>
          );
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <TabsList className="h-10">
            <TabsTrigger value="variations">Variations</TabsTrigger>
            <TabsTrigger value="residuelles">Résiduelles</TabsTrigger>
            <TabsTrigger value="volumes">Volumes</TabsTrigger>
            <TabsTrigger value="titre">Par titre</TabsTrigger>
            <TabsTrigger value="dividendes">Dividendes</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="variations">
          <Variations rows={u.rows} onPick={(id) => { setFocus(id); setTab("titre"); }} />
        </TabsContent>
        <TabsContent value="residuelles">
          <Residuelles rows={u.rows} onPick={(id) => { setFocus(id); setTab("titre"); }} />
        </TabsContent>
        <TabsContent value="volumes">
          <Volumes rows={u.rows} onPick={(id) => { setFocus(id); setTab("titre"); }} />
        </TabsContent>
        <TabsContent value="titre">
          <ParTitre rows={u.rows} focus={focus || u.rows[0]?.securityId || ""} onFocus={setFocus} />
        </TabsContent>
        <TabsContent value="dividendes">
          <Dividendes rows={u.rows} lastDate={u.lastDate} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function SectorFilter({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[220px]" aria-label="Secteur">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Tous les secteurs</SelectItem>
        {SECTORS.map((s) => (
          <SelectItem key={s} value={s}>{s}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TickerCell({ r }: { r: UniverseRow }) {
  return (
    <div className="min-w-0">
      <span className="font-semibold">{r.ticker}</span>
      <span className="block max-w-[220px] truncate text-xs text-muted-foreground">{r.name}</span>
    </div>
  );
}

function Variations({ rows, onPick }: { rows: UniverseRow[]; onPick: (id: string) => void }) {
  const [period, setPeriod] = useState<Period>("1J");
  const [sector, setSector] = useState("all");
  const [q, setQ] = useState("");
  const list = useMemo(
    () =>
      rows
        .filter((r) => (sector === "all" || r.sector === sector) && (!q || (r.ticker + r.name).toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => (pick(b, period) ?? -9) - (pick(a, period) ?? -9)),
    [rows, period, sector, q],
  );
  const up = list.filter((r) => (pick(r, period) ?? 0) > 0).length;
  const down = list.filter((r) => (pick(r, period) ?? 0) < 0).length;
  const top = list.slice(0, 5);
  const flop = [...list].reverse().slice(0, 5);

  const cols: Column<UniverseRow>[] = [
    { key: "t", header: "Titre", cell: (r) => <TickerCell r={r} /> },
    { key: "s", header: "Secteur", cell: (r) => <span className="text-muted-foreground">{r.sector}</span> },
    { key: "c", header: "Cours", align: "right", cell: (r) => fmtNum(r.close) },
    { key: "d", header: "Jour", align: "right", cell: (r) => <Pct value={r.change} /> },
    { key: "w", header: "1 sem.", align: "right", cell: (r) => <Pct value={r.ch1w} /> },
    { key: "m", header: "1 mois", align: "right", cell: (r) => <Pct value={r.ch1m} /> },
    { key: "y", header: "Depuis janv.", align: "right", cell: (r) => <Pct value={r.chYtd} /> },
    { key: "a", header: "1 an", align: "right", cell: (r) => <Pct value={r.ch1y} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <PeriodTabs value={period} onChange={setPeriod} options={PERIODS} />
        <SectorFilter value={sector} onChange={setSector} />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un titre" className="h-9 w-48" aria-label="Rechercher un titre" />
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-gain">{up} en hausse</span> · <span className="font-semibold text-loss">{down} en baisse</span> · {list.length - up - down} stables
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title={<span className="inline-flex items-center gap-2"><ArrowUpRight className="h-4 w-4 text-gain" /> Plus fortes hausses</span>}>
          <RankList rows={top} value={(r) => pick(r, period)} onPick={onPick} />
        </Section>
        <Section title={<span className="inline-flex items-center gap-2"><ArrowDownRight className="h-4 w-4 text-loss" /> Plus fortes baisses</span>}>
          <RankList rows={flop} value={(r) => pick(r, period)} onPick={onPick} />
        </Section>
      </div>
      <Section title="Toutes les variations" description="Clique sur une ligne pour l'analyser.">
        <DataTable rows={list} columns={cols} rowKey={(r) => r.securityId} onRowClick={(r) => onPick(r.securityId)} />
      </Section>
    </div>
  );
}

function RankList({ rows, value, onPick }: { rows: UniverseRow[]; value: (r: UniverseRow) => number | null; onPick: (id: string) => void }) {
  return (
    <ol className="space-y-1">
      {rows.map((r, i) => (
        <li key={r.securityId}>
          <button onClick={() => onPick(r.securityId)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-secondary">
            <span className="w-5 text-xs text-muted-foreground tabular">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="font-semibold">{r.ticker}</span>
              <span className="ml-2 truncate text-xs text-muted-foreground">{r.name}</span>
            </span>
            <span className="text-sm tabular">{fmtNum(r.close)}</span>
            <DeltaBadge value={value(r)} />
          </button>
        </li>
      ))}
    </ol>
  );
}

function Residuelles({ rows, onPick }: { rows: UniverseRow[]; onPick: (id: string) => void }) {
  const bids = rows.filter((r) => r.bidQty > 0).sort((a, b) => b.bidQty * (b.close ?? 0) - a.bidQty * (a.close ?? 0));
  const asks = rows.filter((r) => r.askQty > 0).sort((a, b) => b.askQty * (b.close ?? 0) - a.askQty * (a.close ?? 0));
  const bidValue = bids.reduce((s, r) => s + r.bidQty * (r.close ?? 0), 0);
  const askValue = asks.reduce((s, r) => s + r.askQty * (r.close ?? 0), 0);
  const cols = (side: "bid" | "ask"): Column<UniverseRow>[] => [
    { key: "t", header: "Titre", cell: (r) => <TickerCell r={r} /> },
    { key: "c", header: "Cours", align: "right", cell: (r) => fmtNum(r.close) },
    { key: "v", header: "Variation", align: "right", cell: (r) => <Pct value={r.change} /> },
    { key: "q", header: side === "bid" ? "Qté demandée" : "Qté offerte", align: "right", cell: (r) => fmtNum(side === "bid" ? r.bidQty : r.askQty) },
    { key: "m", header: "Valeur", align: "right", cell: (r) => fmtFCFA((side === "bid" ? r.bidQty : r.askQty) * (r.close ?? 0)) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Demandes non servies" value={<Money value={bidValue} />} sub={`${bids.length} titres avec acheteurs en attente`} />
        <StatCard label="Offres non servies" value={<Money value={askValue} />} sub={`${asks.length} titres avec vendeurs en attente`} />
        <StatCard label="Pression nette" value={<Money value={bidValue - askValue} signed tone />} sub={bidValue >= askValue ? "Marché plutôt acheteur" : "Marché plutôt vendeur"} emphasis />
      </div>
      <p className="text-sm text-muted-foreground">
        Les ordres résiduels sont les quantités restées au carnet à la clôture : une demande résiduelle forte signale des acheteurs qui n'ont pas trouvé de vendeurs.
      </p>
      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Demandes résiduelles" description="Acheteurs en attente à la clôture">
          <DataTable rows={bids} columns={cols("bid")} rowKey={(r) => r.securityId} onRowClick={(r) => onPick(r.securityId)} empty="Aucune demande résiduelle." />
        </Section>
        <Section title="Offres résiduelles" description="Vendeurs en attente à la clôture">
          <DataTable rows={asks} columns={cols("ask")} rowKey={(r) => r.securityId} onRowClick={(r) => onPick(r.securityId)} empty="Aucune offre résiduelle." />
        </Section>
      </div>
    </div>
  );
}

function Volumes({ rows, onPick }: { rows: UniverseRow[]; onPick: (id: string) => void }) {
  const byValue = [...rows].sort((a, b) => b.tradedValue - a.tradedValue);
  const total = rows.reduce((s, r) => s + r.tradedValue, 0);
  const totalVol = rows.reduce((s, r) => s + r.volume, 0);
  const cap = rows.reduce((s, r) => s + r.marketCap, 0);
  const sectors = SECTORS.map((s) => ({ name: s, value: rows.filter((r) => r.sector === s).reduce((t, r) => t + r.tradedValue, 0) })).sort((a, b) => b.value - a.value);
  const chart = byValue.slice(0, 10).map((r) => ({ key: r.ticker, value: r.tradedValue, sector: r.sector }));
  const cols: Column<UniverseRow>[] = [
    { key: "t", header: "Titre", cell: (r) => <TickerCell r={r} /> },
    { key: "c", header: "Cours", align: "right", cell: (r) => fmtNum(r.close) },
    { key: "v", header: "Variation", align: "right", cell: (r) => <Pct value={r.change} /> },
    { key: "q", header: "Titres échangés", align: "right", cell: (r) => fmtNum(r.volume) },
    { key: "m", header: "Valeur échangée", align: "right", cell: (r) => fmtFCFA(r.tradedValue) },
    { key: "p", header: "Part du marché", align: "right", cell: (r) => fmtPct(total ? r.tradedValue / total : null) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Valeur échangée" value={<Money value={total} />} sub="Sur la séance" emphasis />
        <StatCard label="Titres échangés" value={fmtNum(totalVol)} sub={`${rows.filter((r) => r.volume > 0).length} sociétés traitées`} />
        <StatCard label="Capitalisation" value={`${fmtNum(cap / 1e9, 0)} Md FCFA`} sub="Les 48 sociétés au dernier cours" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Top 10 des valeurs échangées" className="lg:col-span-2">
          <div className="h-72" role="img" aria-label="Top 10 des valeurs échangées">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart} margin={{ top: 5, right: 4, left: -4, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtNum(v / 1e6, 0) + " M"} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtFCFA(v), "Valeur échangée"]} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chart.map((d) => (
                    <Cell key={d.key} fill={SECTOR_COLORS[d.sector] ?? "var(--chart-1)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>
        <Section title="Par secteur">
          <ul className="space-y-3">
            {sectors.map((s) => (
              <li key={s.name}>
                <div className="flex justify-between text-sm">
                  <span>{s.name}</span>
                  <span className="tabular text-muted-foreground">{fmtPct(total ? s.value / total : 0, { decimals: 1 })}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full" style={{ width: `${total ? (s.value / total) * 100 : 0}%`, background: SECTOR_COLORS[s.name] }} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <Section title="Classement par valeur échangée">
        <DataTable rows={byValue} columns={cols} rowKey={(r) => r.securityId} onRowClick={(r) => onPick(r.securityId)} />
      </Section>
    </div>
  );
}

const CHART_PERIODS = [
  { key: "1M", label: "1M", days: 31 },
  { key: "3M", label: "3M", days: 92 },
  { key: "6M", label: "6M", days: 183 },
  { key: "1A", label: "1A", days: 366 },
] as const;

function ParTitre({ rows, focus, onFocus }: { rows: UniverseRow[]; focus: string; onFocus: (id: string) => void }) {
  const r = rows.find((x) => x.securityId === focus) ?? rows[0];
  const hist = useQuery(securityHistoryQuery(r?.securityId ?? ""));
  const a = useAnalytics();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<(typeof CHART_PERIODS)[number]["key"]>("6M");
  if (!r) return null;
  const bars = hist.data ?? [];
  const last = bars[bars.length - 1]?.date ?? r.date ?? "";
  const from = shiftDays(last, -CHART_PERIODS.find((p) => p.key === period)!.days);
  const shown = bars.filter((b) => b.date >= from);
  const avgVol = shown.length ? shown.reduce((s, b) => s + b.volume, 0) / shown.length : 0;
  const avgVal = shown.length ? shown.reduce((s, b) => s + b.tradedValue, 0) / shown.length : 0;
  const pos = a.valuation?.positions.find((p) => p.securityId === r.securityId);
  const sectorPeers = rows.filter((x) => x.sector === r.sector);
  const sectorAvg = sectorPeers.reduce((s, x) => s + (x.ch1y ?? 0), 0) / (sectorPeers.length || 1);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={r.securityId} onValueChange={onFocus}>
          <SelectTrigger className="h-10 w-[320px]" aria-label="Choisir un titre">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {[...rows].sort((x, y) => x.ticker.localeCompare(y.ticker)).map((x) => (
              <SelectItem key={x.securityId} value={x.securityId}>
                {x.ticker} · {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <button
          onClick={() => navigate({ to: "/dashboard/analyse", search: { t: r.ticker } })}
          className="inline-flex items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
        >
          Fiche complète <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dernier cours" value={fmtFCFA(r.close)} sub={<DeltaBadge value={r.change} />} emphasis />
        <StatCard label="Sur 1 an" value={<Pct value={r.ch1y} />} sub={`Moyenne du secteur : ${fmtPct(sectorAvg, { signed: true })}`} />
        <StatCard label="Plus haut / bas 52 sem." value={`${fmtNum(r.high52)} / ${fmtNum(r.low52)}`} sub={r.high52 && r.close ? `${fmtPct(r.close / r.high52 - 1, { signed: true })} du plus haut` : undefined} />
        <StatCard label="Volume moyen" value={fmtNum(avgVol)} sub={`${fmtFCFA(avgVal)} par séance`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title={`${r.ticker} — évolution du cours`} className="lg:col-span-2" actions={<PeriodTabs value={period} onChange={setPeriod} options={CHART_PERIODS} />}>
          {hist.isLoading ? <div className="h-[260px] animate-pulse rounded-lg bg-muted" /> : <PriceLineChart data={shown} />}
        </Section>
        <Section title="Repères">
          <KeyValue label="Secteur" value={r.sector} />
          <KeyValue label="Pays" value={r.country} />
          <KeyValue label="Variation 1 semaine" value={<Pct value={r.ch1w} />} />
          <KeyValue label="Variation 1 mois" value={<Pct value={r.ch1m} />} />
          <KeyValue label="Variation 3 mois" value={<Pct value={r.ch3m} />} />
          <KeyValue label="Rendement du dividende" value={fmtPct(r.yield)} />
          <KeyValue label="PER" value={r.per ? fmtNum(r.per, 1) : "—"} />
          {pos && <KeyValue label="Ta position" value={`${fmtNum(pos.quantity)} titres · ${fmtFCFA(pos.marketValue)}`} />}
        </Section>
      </div>
    </div>
  );
}

function Dividendes({ rows, lastDate }: { rows: UniverseRow[]; lastDate: string | null }) {
  const u = useUniverse();
  const [year, setYear] = useState("2025");
  const bySec = new Map(rows.map((r) => [r.securityId, r]));
  const list = u.dividends.filter((d) => String(d.fiscalYear) === year);
  const upcoming = u.dividends.filter((d) => lastDate && d.exDate > lastDate).sort((a, b) => a.exDate.localeCompare(b.exDate));
  const enriched = list
    .map((d) => {
      const r = bySec.get(d.securityId);
      return { ...d, r, yld: r?.close ? d.amount / r.close : null };
    })
    .sort((a, b) => (b.yld ?? 0) - (a.yld ?? 0));
  const avgYield = enriched.length ? enriched.reduce((s, d) => s + (d.yld ?? 0), 0) / enriched.length : 0;
  type Row = (typeof enriched)[number];
  const cols: Column<Row>[] = [
    { key: "t", header: "Titre", cell: (d) => (d.r ? <TickerCell r={d.r} /> : "—") },
    { key: "a", header: "Dividende net/action", align: "right", cell: (d) => fmtFCFA(d.amount) },
    { key: "y", header: "Rendement", align: "right", cell: (d) => <span className={cn("font-semibold", (d.yld ?? 0) >= 0.07 && "text-gain")}>{fmtPct(d.yld)}</span> },
    { key: "e", header: "Détachement", align: "right", cell: (d) => fmtDate(d.exDate) },
    { key: "p", header: "Paiement", align: "right", cell: (d) => fmtDate(d.payDate) },
    { key: "s", header: "Statut", cell: (d) => (lastDate && d.exDate > lastDate ? <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs font-semibold">À venir</span> : <span className="text-xs text-muted-foreground">Détaché</span>) },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Sociétés distributrices" value={fmtNum(list.length)} sub={`Exercice ${year}`} />
        <StatCard label="Rendement moyen" value={fmtPct(avgYield)} sub="Sur le dernier cours" emphasis />
        <StatCard label="Prochains détachements" value={fmtNum(upcoming.length)} sub={upcoming[0] ? `Prochain : ${upcoming[0] && bySec.get(upcoming[0].securityId)?.ticker} le ${fmtDate(upcoming[0].exDate)}` : "Aucun annoncé"} />
      </div>
      {upcoming.length > 0 && (
        <Section title={<span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> Calendrier à venir</span>}>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcoming.map((d) => {
              const r = bySec.get(d.securityId);
              return (
                <div key={d.id} className="min-w-[160px] rounded-xl border bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">{fmtDate(d.exDate)}</p>
                  <p className="mt-1 font-semibold">{r?.ticker}</p>
                  <p className="text-sm tabular">{fmtFCFA(d.amount)}</p>
                  <p className="text-xs text-gain">{fmtPct(r?.close ? d.amount / r.close : null)}</p>
                </div>
              );
            })}
          </div>
        </Section>
      )}
      <Section
        title="Dividendes par société"
        description="Montants nets par action annoncés, classés par rendement."
        actions={
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-9 w-40" aria-label="Exercice">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">Exercice 2025</SelectItem>
              <SelectItem value="2024">Exercice 2024</SelectItem>
            </SelectContent>
          </Select>
        }
      >
        <DataTable rows={enriched} columns={cols} rowKey={(d) => d.id} />
      </Section>
      <p className="text-xs text-muted-foreground">
        Le rendement est calculé sur le dernier cours. <Link to="/dashboard/analyse/screener" className="underline underline-offset-4">Filtrer par rendement dans le screener</Link>.
      </p>
    </div>
  );
}
