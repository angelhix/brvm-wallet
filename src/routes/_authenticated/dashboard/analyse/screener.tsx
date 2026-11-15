import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, RotateCcw, SlidersHorizontal } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Pct, Section } from "@/components/app/kpi";
import { ErrorState, LoadingGrid } from "@/components/app/states";
import { Tour } from "@/components/app/tour";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useUniverse, type UniverseRow } from "@/lib/market-analytics";
import { SECTORS } from "@/lib/constants";
import { fmtNum, fmtPct } from "@/lib/format";
import { exportCsv } from "@/lib/export";
import { parseNumber } from "@/lib/import";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/analyse/screener")({
  head: () => ({
    meta: [
      { title: "Screener BRVM — Kauri" },
      { name: "description", content: "Filtre les 48 sociétés cotées à la BRVM par variation, rendement, PER, PBR, ROE, capitalisation et secteur." },
    ],
  }),
  component: Screener,
});

export interface ScreenerFilters {
  sectors: string[];
  country: string;
  minChange: string;
  min1y: string;
  max1y: string;
  minYield: string;
  maxPer: string;
  maxPbr: string;
  minRoe: string;
  minCap: string;
  minValue: string;
}
const EMPTY: ScreenerFilters = { sectors: [], country: "all", minChange: "", min1y: "", max1y: "", minYield: "", maxPer: "", maxPbr: "", minRoe: "", minCap: "", minValue: "" };

const PRESETS: { label: string; hint: string; f: Partial<ScreenerFilters> }[] = [
  { label: "Gros rendement", hint: "Dividende ≥ 7 %", f: { minYield: "7" } },
  { label: "Décotés", hint: "PER ≤ 10 et PBR ≤ 1,5", f: { maxPer: "10", maxPbr: "1,5" } },
  { label: "Banques rentables", hint: "Services financiers, ROE ≥ 18 %", f: { sectors: ["Services financiers"], minRoe: "18" } },
  { label: "Tendance haussière", hint: "+20 % sur un an", f: { min1y: "20" } },
  { label: "Grandes capitalisations", hint: "≥ 500 Md FCFA", f: { minCap: "500" } },
];

const num = (s: string) => (s.trim() ? parseNumber(s) : null);

export function applyScreener(rows: UniverseRow[], f: ScreenerFilters): UniverseRow[] {
  const minChange = num(f.minChange), min1y = num(f.min1y), max1y = num(f.max1y), minYield = num(f.minYield);
  const maxPer = num(f.maxPer), maxPbr = num(f.maxPbr), minRoe = num(f.minRoe), minCap = num(f.minCap), minValue = num(f.minValue);
  return rows.filter((r) => {
    if (f.sectors.length && !f.sectors.includes(r.sector)) return false;
    if (f.country !== "all" && r.country !== f.country) return false;
    if (minChange != null && (r.change ?? -1) * 100 < minChange) return false;
    if (min1y != null && (r.ch1y ?? -1) * 100 < min1y) return false;
    if (max1y != null && (r.ch1y ?? 99) * 100 > max1y) return false;
    if (minYield != null && (r.yield ?? 0) * 100 < minYield) return false;
    if (maxPer != null && (r.per == null || r.per <= 0 || r.per > maxPer)) return false;
    if (maxPbr != null && (r.pbr == null || r.pbr > maxPbr)) return false;
    if (minRoe != null && (r.roe ?? -1) * 100 < minRoe) return false;
    if (minCap != null && r.marketCap / 1e9 < minCap) return false;
    if (minValue != null && r.tradedValue / 1e6 < minValue) return false;
    return true;
  });
}

type SortKey = "ticker" | "close" | "change" | "ch1y" | "yield" | "per" | "pbr" | "roe" | "marketCap" | "tradedValue";
const COLS: { key: SortKey; label: string; render: (r: UniverseRow) => React.ReactNode }[] = [
  { key: "close", label: "Cours", render: (r) => fmtNum(r.close) },
  { key: "change", label: "Jour", render: (r) => <Pct value={r.change} /> },
  { key: "ch1y", label: "1 an", render: (r) => <Pct value={r.ch1y} /> },
  { key: "yield", label: "Rendement", render: (r) => <span className={cn((r.yield ?? 0) >= 0.07 && "font-semibold text-gain")}>{fmtPct(r.yield)}</span> },
  { key: "per", label: "PER", render: (r) => (r.per ? fmtNum(r.per, 1) : "—") },
  { key: "pbr", label: "PBR", render: (r) => (r.pbr ? fmtNum(r.pbr, 2) : "—") },
  { key: "roe", label: "ROE", render: (r) => fmtPct(r.roe, { decimals: 1 }) },
  { key: "marketCap", label: "Capi. (Md)", render: (r) => fmtNum(r.marketCap / 1e9, 0) },
  { key: "tradedValue", label: "Échangé (M)", render: (r) => fmtNum(r.tradedValue / 1e6, 1) },
];

const STEPS = [
  { target: '[data-tour="screener-presets"]', title: "Filtres prêts à l'emploi", body: "Un clic applique une stratégie classique : rendement, décote, momentum…" },
  { target: '[data-tour="screener-results"]', title: "Résultats", body: "Trie chaque colonne et clique sur une ligne pour ouvrir la fiche du titre." },
];

function Field({ id, label, suffix, value, onChange, placeholder }: { id: string; label: string; suffix: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <div className="relative">
        <Input id={id} inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "—"} className="h-9 pr-12" />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{suffix}</span>
      </div>
    </div>
  );
}

function Filters({ f, set, countries }: { f: ScreenerFilters; set: (p: Partial<ScreenerFilters>) => void; countries: string[] }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Secteur</p>
        <div className="space-y-2">
          {SECTORS.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <Checkbox checked={f.sectors.includes(s)} onCheckedChange={(v) => set({ sectors: v ? [...f.sectors, s] : f.sectors.filter((x) => x !== s) })} />
              {s}
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Pays</Label>
        <Select value={f.country} onValueChange={(v) => set({ country: v })}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les pays</SelectItem>
            {countries.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field id="minChange" label="Variation jour min." suffix="%" value={f.minChange} onChange={(v) => set({ minChange: v })} />
        <Field id="minYield" label="Rendement min." suffix="%" value={f.minYield} onChange={(v) => set({ minYield: v })} />
        <Field id="min1y" label="1 an min." suffix="%" value={f.min1y} onChange={(v) => set({ min1y: v })} />
        <Field id="max1y" label="1 an max." suffix="%" value={f.max1y} onChange={(v) => set({ max1y: v })} />
        <Field id="maxPer" label="PER max." suffix="x" value={f.maxPer} onChange={(v) => set({ maxPer: v })} />
        <Field id="maxPbr" label="PBR max." suffix="x" value={f.maxPbr} onChange={(v) => set({ maxPbr: v })} />
        <Field id="minRoe" label="ROE min." suffix="%" value={f.minRoe} onChange={(v) => set({ minRoe: v })} />
        <Field id="minCap" label="Capi. min." suffix="Md" value={f.minCap} onChange={(v) => set({ minCap: v })} />
        <Field id="minValue" label="Échangé min." suffix="M" value={f.minValue} onChange={(v) => set({ minValue: v })} />
      </div>
    </div>
  );
}

function Screener() {
  const u = useUniverse();
  const navigate = useNavigate();
  const [f, setF] = useState<ScreenerFilters>(EMPTY);
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "yield", desc: true });
  const set = (p: Partial<ScreenerFilters>) => setF((x) => ({ ...x, ...p }));
  const countries = useMemo(() => [...new Set(u.rows.map((r) => r.country))].sort(), [u.rows]);
  const results = useMemo(() => {
    const out = applyScreener(u.rows, f);
    return out.sort((a, b) => {
      const x = sort.key === "ticker" ? a.ticker : (a[sort.key] ?? -Infinity);
      const y = sort.key === "ticker" ? b.ticker : (b[sort.key] ?? -Infinity);
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.desc ? -c : c;
    });
  }, [u.rows, f, sort]);
  const active = JSON.stringify(f) !== JSON.stringify(EMPTY);

  if (u.error) return <ErrorState error={u.error} />;
  if (u.loading) return <LoadingGrid cards={0} rows={2} />;

  const head = (key: SortKey, label: string, right = true) => (
    <th scope="col" className={cn("px-3 py-2 font-medium", right ? "text-right" : "text-left")}>
      <button className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground" onClick={() => setSort((s) => ({ key, desc: s.key === key ? !s.desc : key !== "ticker" }))}>
        {label}
        {sort.key === key && (sort.desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
      </button>
    </th>
  );

  function exportResults() {
    exportCsv(
      `kauri-screener-${u.lastDate ?? ""}.csv`,
      ["Titre", "Nom", "Secteur", "Pays", "Cours", "Variation jour", "1 an", "Rendement", "PER", "PBR", "ROE", "Capitalisation"],
      results.map((r) => [r.ticker, r.name, r.sector, r.country, r.close, fmtPct(r.change), fmtPct(r.ch1y), fmtPct(r.yield), r.per ? fmtNum(r.per, 1) : "", r.pbr ? fmtNum(r.pbr, 2) : "", fmtPct(r.roe), Math.round(r.marketCap)]),
    );
  }

  return (
    <>
      <Tour zone="screener" steps={STEPS} ready={!u.loading} />
      <PageHeader
        eyebrow="Analyse"
        title="Screener"
        description="Filtre les sociétés cotées selon tes critères financiers. Ratios calculés sur le dernier cours et l'exercice 2025."
        actions={
          <>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="lg:hidden"><SlidersHorizontal /> Filtres</Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] overflow-y-auto">
                <SheetHeader className="p-0 pb-4"><SheetTitle>Filtres</SheetTitle></SheetHeader>
                <Filters f={f} set={set} countries={countries} />
              </SheetContent>
            </Sheet>
            <Button variant="outline" onClick={exportResults}><Download /> Exporter</Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2" data-tour="screener-presets">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => setF({ ...EMPTY, ...p.f })}
            className="rounded-full border bg-card px-3 py-1.5 text-left text-sm shadow-card transition-colors hover:border-primary"
            title={p.hint}
          >
            <span className="font-semibold">{p.label}</span>
            <span className="ml-2 text-xs text-muted-foreground">{p.hint}</span>
          </button>
        ))}
        {active && (
          <Button variant="ghost" size="sm" onClick={() => setF(EMPTY)}><RotateCcw /> Réinitialiser</Button>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <Section title="Critères">
            <Filters f={f} set={set} countries={countries} />
          </Section>
        </aside>
        <Section title={`${results.length} titre${results.length > 1 ? "s" : ""} sur ${u.rows.length}`} description="Clique sur une ligne pour ouvrir la fiche." data-tour="screener-results">
          <div className="-mx-4 overflow-x-auto sm:mx-0">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  {head("ticker", "Titre", false)}
                  <th className="px-3 py-2 text-left font-medium uppercase tracking-wider">Secteur</th>
                  {COLS.map((c) => head(c.key, c.label))}
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.securityId} className="cursor-pointer border-b last:border-0 hover:bg-secondary/60" onClick={() => navigate({ to: "/dashboard/analyse", search: { t: r.ticker } })}>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold">{r.ticker}</span>
                      <span className="block max-w-[200px] truncate text-xs text-muted-foreground">{r.name}</span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{r.sector}</td>
                    {COLS.map((c) => (
                      <td key={c.key} className="px-3 py-2.5 text-right tabular">{c.render(r)}</td>
                    ))}
                  </tr>
                ))}
                {results.length === 0 && (
                  <tr>
                    <td colSpan={COLS.length + 2} className="px-3 py-10 text-center text-muted-foreground">
                      Aucun titre ne remplit tous ces critères. Assouplis un filtre.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </>
  );
}
