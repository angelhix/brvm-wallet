import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DailyPoint, PricePoint } from "@/lib/engine";
import { fmtDate, fmtDayMonth, fmtFCFA, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

const PERIODS = [
  { key: "1M", label: "1M", days: 31 },
  { key: "3M", label: "3M", days: 92 },
  { key: "6M", label: "6M", days: 183 },
  { key: "1A", label: "1A", days: 366 },
  { key: "ALL", label: "Tout", days: 100000 },
] as const;

function cutoff(last: string, days: number) {
  const d = new Date(last + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function PeriodTabs<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: readonly { key: T; label: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border bg-secondary p-0.5" role="tablist">
      {options.map((o) => (
        <button
          key={o.key}
          role="tab"
          aria-selected={value === o.key}
          onClick={() => onChange(o.key)}
          className={cn("rounded-md px-2.5 py-1 text-xs font-semibold transition-colors", value === o.key ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

export function Base100Chart({ daily, benchmark, benchmarkLabel = "BRVM Composite" }: { daily: DailyPoint[]; benchmark: PricePoint[]; benchmarkLabel?: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("ALL");
  const data = useMemo(() => {
    if (daily.length === 0) return [];
    const last = daily[daily.length - 1]!.date;
    const from = cutoff(last, PERIODS.find((p) => p.key === period)!.days);
    const pts = daily.filter((p) => p.date >= from);
    if (pts.length === 0) return [];
    const first = pts[0]!;
    const base = first.index;
    const bmap = new Map(benchmark.map((b) => [b.date, b.close]));
    const bStart = bmap.get(first.date) ?? benchmark.find((b) => b.date >= first.date)?.close ?? null;
    return pts.map((p) => {
      const b = bmap.get(p.date);
      return { date: p.date, portfolio: (p.index / base) * 100, benchmark: b && bStart ? (b / bStart) * 100 : null };
    });
  }, [daily, benchmark, period]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;
    let hi = data[0]!;
    let lo = data[0]!;
    for (const d of data) {
      if (d.portfolio > hi.portfolio) hi = d;
      if (d.portfolio < lo.portfolio) lo = d;
    }
    const last = data[data.length - 1]!;
    return { hi, lo, last, gap: last.benchmark != null ? last.portfolio - last.benchmark : null };
  }, [data]);

  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">Pas encore assez d'historique pour tracer l'indice.</p>;

  const alt = stats
    ? `Indice base 100 du portefeuille : ${fmtNum(stats.last.portfolio, 2)} au ${fmtDate(stats.last.date)}, contre ${fmtNum(stats.last.benchmark, 2)} pour le ${benchmarkLabel}, soit un écart de ${fmtNum(stats.gap, 1)} points.`
    : "";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-primary" />Mon portefeuille</span>
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 rounded bg-chart-2" />{benchmarkLabel}</span>
        </div>
        <PeriodTabs value={period} onChange={setPeriod} options={PERIODS} />
      </div>
      <div className="h-64 sm:h-72" role="img" aria-label={alt}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtDayMonth} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={40} axisLine={false} tickLine={false} />
            <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => fmtNum(v, 0)} />
            <ReferenceLine y={100} stroke="var(--muted-foreground)" strokeDasharray="2 4" />
            <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtDate(String(l))} formatter={(v: number, n) => [fmtNum(v, 2), n === "portfolio" ? "Mon portefeuille" : benchmarkLabel]} />
            <Line type="monotone" dataKey="benchmark" stroke="var(--chart-2)" strokeWidth={2} dot={false} connectNulls />
            <Line type="monotone" dataKey="portfolio" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {stats && (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-muted-foreground">Valeur actuelle</dt><dd className="font-semibold tabular">{fmtNum(stats.last.portfolio, 2)}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Plus haut</dt><dd className="font-semibold tabular">{fmtNum(stats.hi.portfolio, 2)} <span className="text-xs font-normal text-muted-foreground">{fmtDayMonth(stats.hi.date)}</span></dd></div>
          <div><dt className="text-xs text-muted-foreground">Plus bas</dt><dd className="font-semibold tabular">{fmtNum(stats.lo.portfolio, 2)} <span className="text-xs font-normal text-muted-foreground">{fmtDayMonth(stats.lo.date)}</span></dd></div>
          <div>
            <dt className="text-xs text-muted-foreground">Écart vs {benchmarkLabel}</dt>
            <dd className={cn("font-semibold tabular", (stats.gap ?? 0) >= 0 ? "text-gain" : "text-loss")}>{stats.gap == null ? "—" : `${stats.gap >= 0 ? "+" : "−"}${fmtNum(Math.abs(stats.gap), 1)} pts`}</dd>
          </div>
        </dl>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Mis à jour au {fmtDate(stats?.last.date)} · base 100 au début de la période affichée</p>
    </div>
  );
}

export function DonutChart({ data, center }: { data: { name: string; value: number; color: string }[]; center?: React.ReactNode }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="relative h-48" role="img" aria-label={data.map((d) => `${d.name} ${fmtNum(total ? (d.value / total) * 100 : 0, 1)} %`).join(", ")}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" paddingAngle={1.5} stroke="none">
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n) => [`${fmtNum(total ? (v / total) * 100 : 0, 1)} %`, n]} />
        </PieChart>
      </ResponsiveContainer>
      {center && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">{center}</div>}
    </div>
  );
}

export function GainBarChart({ data, labelFormatter = fmtDayMonth, height = 240 }: { data: { key: string; gain: number }[]; labelFormatter?: (k: string) => string; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Gain net par période">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 4, left: -8, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="key" tickFormatter={labelFormatter} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={12} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtNum(v / 1000, 0) + "k"} />
          <ReferenceLine y={0} stroke="var(--muted-foreground)" />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => labelFormatter(String(l))} formatter={(v: number) => [fmtFCFA(v, { signed: true }), "Gain net"]} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="gain" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.key} fill={d.gain >= 0 ? "var(--gain)" : "var(--loss)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PriceLineChart({ data, height = 260 }: { data: { date: string; close: number }[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label={data.length ? `Cours de ${fmtNum(data[0]!.close)} à ${fmtNum(data[data.length - 1]!.close)} FCFA` : "Pas de cours"}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 8, left: -4, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="date" tickFormatter={fmtDayMonth} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={40} axisLine={false} tickLine={false} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtNum(v)} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={(l) => fmtDate(String(l))} formatter={(v: number) => [fmtFCFA(v), "Clôture"]} />
          <Line type="monotone" dataKey="close" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SimpleBarChart({ data, height = 220, valueLabel, color = "var(--chart-2)" }: { data: { key: string; value: number }[]; height?: number; valueLabel: string; color?: string }) {
  return (
    <div style={{ height }} role="img" aria-label={`${valueLabel} par exercice`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 4, left: -4, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="key" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={56} tickFormatter={(v) => fmtNum(v / 1e9, 1) + " Md"} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [fmtFCFA(v), valueLabel]} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
