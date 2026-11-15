import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Filter, Wallet } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { DeltaBadge, KeyValue, Money, Pct, Section, StatCard } from "@/components/app/kpi";
import { DataTable, type Column } from "@/components/app/data-table";
import { PeriodTabs, PriceLineChart, SimpleBarChart } from "@/components/app/charts";
import { ErrorState, LoadingGrid } from "@/components/app/states";
import { Tour } from "@/components/app/tour";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fundamentalsQuery, isBank, securityHistoryQuery, type SecurityBar } from "@/lib/market";
import { shiftDays, useUniverse } from "@/lib/market-analytics";
import { useAnalytics } from "@/lib/portfolio";
import { fmtDate, fmtFCFA, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/analyse/")({
  validateSearch: (s: Record<string, unknown>): { t?: string } => (typeof s["t"] === "string" && s["t"] ? { t: s["t"].toUpperCase() } : {}),
  head: () => ({
    meta: [
      { title: "Fiche titre — Kauri" },
      { name: "description", content: "Fondamentaux, ratios, historique des cours et des dividendes de chaque société cotée à la BRVM." },
    ],
  }),
  component: FicheTitre,
});

const STEPS = [
  { target: '[data-tour="fiche-picker"]', title: "Choisis un titre", body: "Tape un code ou un nom : les 48 sociétés cotées sont disponibles." },
  { target: '[data-tour="fiche-ratios"]', title: "Les ratios clés", body: "PER, PBR, ROE et rendement sont calculés sur le dernier cours et le dernier exercice publié." },
  { target: '[data-tour="fiche-fundamentals"]', title: "Les comptes", body: "Chiffre d'affaires (ou PNB pour les banques), RBE et résultat net sur quatre exercices." },
];

const PERIODS = [
  { key: "1M", label: "1M", days: 31 },
  { key: "3M", label: "3M", days: 92 },
  { key: "6M", label: "6M", days: 183 },
  { key: "1A", label: "1A", days: 366 },
] as const;

function FicheTitre() {
  const { t } = Route.useSearch();
  const navigate = useNavigate();
  const u = useUniverse();
  const a = useAnalytics();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("1A");

  const r = useMemo(() => u.rows.find((x) => x.ticker === (t ?? "SNTS")) ?? u.rows[0], [u.rows, t]);
  const hist = useQuery(securityHistoryQuery(r?.securityId ?? ""));
  const funds = useQuery(fundamentalsQuery(r?.securityId ?? ""));

  if (u.error) return <ErrorState error={u.error} />;
  if (u.loading || !r) return <LoadingGrid cards={4} rows={2} />;

  const bank = isBank(r.sector);
  const revenueLabel = bank ? "PNB" : "Chiffre d'affaires";
  const bars = hist.data ?? [];
  const last = bars[bars.length - 1]?.date ?? r.date ?? "";
  const shown = bars.filter((b) => b.date >= shiftDays(last, -PERIODS.find((p) => p.key === period)!.days));
  const fy = funds.data ?? [];
  const latestF = fy[fy.length - 1];
  const prevF = fy[fy.length - 2];
  const growth = (k: "revenue" | "netIncome") => (latestF && prevF && prevF[k] ? latestF[k] / prevF[k] - 1 : null);
  const divs = u.dividends.filter((d) => d.securityId === r.securityId).sort((x, y) => y.exDate.localeCompare(x.exDate));
  const pos = a.valuation?.positions.find((p) => p.securityId === r.securityId);
  const peers = u.rows.filter((x) => x.sector === r.sector && x.securityId !== r.securityId).sort((x, y) => y.marketCap - x.marketCap).slice(0, 5);
  const sectorPer = (() => {
    const v = u.rows.filter((x) => x.sector === r.sector && x.per && x.per > 0).map((x) => x.per!);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  })();

  const recent = [...bars].reverse().slice(0, 15);
  const barCols: Column<SecurityBar>[] = [
    { key: "d", header: "Séance", cell: (b) => fmtDate(b.date) },
    { key: "o", header: "Ouverture", align: "right", cell: (b) => fmtNum(b.open) },
    { key: "h", header: "Plus haut", align: "right", cell: (b) => fmtNum(b.high) },
    { key: "l", header: "Plus bas", align: "right", cell: (b) => fmtNum(b.low) },
    { key: "c", header: "Clôture", align: "right", cell: (b) => <span className="font-semibold">{fmtNum(b.close)}</span> },
    { key: "v", header: "Volume", align: "right", cell: (b) => fmtNum(b.volume) },
    { key: "t", header: "Valeur", align: "right", cell: (b) => fmtFCFA(b.tradedValue) },
  ];

  return (
    <>
      <Tour zone="fiche" steps={STEPS} ready={!u.loading} />
      <PageHeader
        eyebrow={`${r.sector} · ${r.country}`}
        title={
          <span className="flex flex-wrap items-baseline gap-x-3">
            {r.name} <span className="font-display text-lg text-muted-foreground">{r.ticker}</span>
          </span>
        }
        description={`Dernière séance : ${fmtDate(r.date)}`}
        actions={
          <>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-[260px] justify-between" data-tour="fiche-picker">
                  <span className="truncate">{r.ticker} · {r.name}</span>
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-0" align="end">
                <Command>
                  <CommandInput placeholder="Code ou nom de la société" />
                  <CommandList>
                    <CommandEmpty>Aucun titre trouvé.</CommandEmpty>
                    <CommandGroup>
                      {[...u.rows].sort((x, y) => x.ticker.localeCompare(y.ticker)).map((x) => (
                        <CommandItem
                          key={x.securityId}
                          value={`${x.ticker} ${x.name}`}
                          onSelect={() => {
                            setOpen(false);
                            navigate({ to: "/dashboard/analyse", search: { t: x.ticker } });
                          }}
                        >
                          <Check className={cn("h-4 w-4", x.ticker === r.ticker ? "opacity-100" : "opacity-0")} />
                          <span className="font-semibold">{x.ticker}</span>
                          <span className="truncate text-muted-foreground">{x.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Button asChild variant="ghost">
              <Link to="/dashboard/analyse/screener">
                <Filter /> Screener
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Cours" value={fmtFCFA(r.close)} emphasis sub={<span className="inline-flex items-center gap-2"><DeltaBadge value={r.change} /> sur la séance</span>} />
        <StatCard label="Capitalisation" value={`${fmtNum(r.marketCap / 1e9, 1)} Md`} sub={`${fmtNum(r.sharesOutstanding)} actions`} />
        <StatCard label="Sur 1 an" value={<Pct value={r.ch1y} />} sub={`Depuis janvier : ${fmtPct(r.chYtd, { signed: true })}`} />
        <StatCard label="52 semaines" value={`${fmtNum(r.low52)} – ${fmtNum(r.high52)}`} sub="Plus bas – plus haut" />
      </div>

      {pos && pos.quantity > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-primary/40 bg-gold-soft px-4 py-3 text-sm">
          <span className="inline-flex items-center gap-2 font-semibold"><Wallet className="h-4 w-4" /> Dans ton portefeuille</span>
          <span>{fmtNum(pos.quantity)} titres</span>
          <span>Prix de revient {fmtFCFA(pos.unitCost)}</span>
          <span>Valeur {fmtFCFA(pos.value)}</span>
          <span>Plus-value <Money value={pos.unrealized} signed tone /> (<Pct value={pos.unrealizedPct} />)</span>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Évolution du cours" className="lg:col-span-2" actions={<PeriodTabs value={period} onChange={setPeriod} options={PERIODS} />}>
          {hist.isLoading ? <div className="h-[280px] animate-pulse rounded-lg bg-muted" /> : <PriceLineChart data={shown} height={280} />}
        </Section>
        <Section title="Ratios" description={`Exercice ${latestF?.fiscalYear ?? "—"}`} data-tour="fiche-ratios">
          <KeyValue label="PER" hint={sectorPer ? `Secteur : ${fmtNum(sectorPer, 1)}` : undefined} value={r.per ? fmtNum(r.per, 1) : "—"} />
          <KeyValue label="PBR (cours / actif net)" value={r.pbr ? fmtNum(r.pbr, 2) : "—"} />
          <KeyValue label="ROE" value={fmtPct(r.roe)} />
          <KeyValue label="Marge nette" value={fmtPct(r.netMargin)} />
          <KeyValue label="Bénéfice par action" value={fmtFCFA(r.eps)} />
          <KeyValue label="Rendement du dividende" value={<span className="font-semibold text-gain">{fmtPct(r.yield)}</span>} />
          <KeyValue label="Croissance du résultat" value={<Pct value={growth("netIncome")} />} />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3" data-tour="fiche-fundamentals">
        <Section title={revenueLabel}>
          <SimpleBarChart data={fy.map((f) => ({ key: String(f.fiscalYear), value: f.revenue }))} valueLabel={revenueLabel} color="var(--chart-1)" />
        </Section>
        <Section title={bank ? "Résultat brut d'exploitation (RBE)" : "Excédent brut d'exploitation"}>
          <SimpleBarChart data={fy.map((f) => ({ key: String(f.fiscalYear), value: f.grossOperatingIncome }))} valueLabel="RBE" color="var(--chart-2)" />
        </Section>
        <Section title="Résultat net">
          <SimpleBarChart data={fy.map((f) => ({ key: String(f.fiscalYear), value: f.netIncome }))} valueLabel="Résultat net" color="var(--chart-3)" />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Fondamentaux" description="En millions de FCFA" className="lg:col-span-2">
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Exercice</th>
                  {fy.map((f) => (
                    <th key={f.fiscalYear} className="px-3 py-2 text-right font-medium">{f.fiscalYear}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    [revenueLabel, (f: (typeof fy)[number]) => f.revenue],
                    ["RBE", (f: (typeof fy)[number]) => f.grossOperatingIncome],
                    ["Résultat net", (f: (typeof fy)[number]) => f.netIncome],
                    ["Capitaux propres", (f: (typeof fy)[number]) => f.equity],
                    ["ROE", (f: (typeof fy)[number]) => (f.equity ? f.netIncome / f.equity : 0)],
                  ] as const
                ).map(([label, get]) => (
                  <tr key={label} className="border-b last:border-0">
                    <td className="px-3 py-2.5 text-muted-foreground">{label}</td>
                    {fy.map((f) => (
                      <td key={f.fiscalYear} className="px-3 py-2.5 text-right tabular">
                        {label === "ROE" ? fmtPct(get(f)) : fmtNum(get(f) / 1e6)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
        <Section title="Historique des dividendes">
          {divs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun dividende enregistré.</p>
          ) : (
            <ul className="space-y-1">
              {divs.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3 border-b border-dashed py-2 last:border-0">
                  <span>
                    <span className="font-medium">Exercice {d.fiscalYear}</span>
                    <span className="block text-xs text-muted-foreground">Détachement {fmtDate(d.exDate)} · paiement {fmtDate(d.payDate)}</span>
                  </span>
                  <span className="text-right tabular">
                    <span className="font-semibold">{fmtFCFA(d.amount)}</span>
                    <span className="block text-xs text-gain">{fmtPct(r.close ? d.amount / r.close : null)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Historique des cours" description="15 dernières séances" className="lg:col-span-2">
          <DataTable rows={recent} columns={barCols} rowKey={(b) => b.date} />
        </Section>
        <Section title={`Autres titres · ${r.sector}`}>
          <ul className="space-y-1">
            {peers.map((p) => (
              <li key={p.securityId}>
                <Link to="/dashboard/analyse" search={{ t: p.ticker }} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-secondary">
                  <span className="min-w-0">
                    <span className="font-semibold">{p.ticker}</span>
                    <span className="block truncate text-xs text-muted-foreground">{p.name}</span>
                  </span>
                  <span className="text-right text-xs tabular">
                    PER {p.per ? fmtNum(p.per, 1) : "—"}
                    <span className="block text-gain">{fmtPct(p.yield)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Données de démonstration. Les ratios ne constituent pas un conseil en investissement.</p>
    </>
  );
}
