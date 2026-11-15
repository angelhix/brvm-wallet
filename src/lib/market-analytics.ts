import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PricePoint } from "./engine";
import { allFundamentalsLatestQuery, dividendsQuery, marketLatestQuery, priceHistoryQuery, ratios, type DividendRow, type FundamentalRow, type MarketRow } from "./market";
import { MARKET_START } from "./demo-market";

export function shiftDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Close on or before `date` (series ascending). */
export function closeAtOrBefore(series: PricePoint[], date: string): number | null {
  let out: number | null = null;
  for (const p of series) {
    if (p.date > date) break;
    out = p.close;
  }
  return out;
}

/** Variation between the close on/before `from` and the last close. */
export function changeSince(series: PricePoint[], from: string): number | null {
  const last = series[series.length - 1];
  const base = closeAtOrBefore(series, from) ?? series[0]?.close ?? null;
  if (!last || !base) return null;
  return last.close / base - 1;
}

export interface UniverseRow extends MarketRow {
  ch1w: number | null;
  ch1m: number | null;
  ch3m: number | null;
  chYtd: number | null;
  ch1y: number | null;
  high52: number | null;
  low52: number | null;
  avgVolume: number;
  lastDividend: DividendRow | undefined;
  nextDividend: DividendRow | undefined;
  fundamentals: FundamentalRow | undefined;
  per: number | null;
  pbr: number | null;
  roe: number | null;
  netMargin: number | null;
  yield: number | null;
  eps: number | null;
}

export function buildUniverse(rows: MarketRow[], history: Map<string, PricePoint[]>, dividends: DividendRow[], funds: Map<string, FundamentalRow>): UniverseRow[] {
  return rows.map((r) => {
    const s = history.get(r.securityId) ?? [];
    const last = r.date ?? s[s.length - 1]?.date ?? MARKET_START;
    const year = s.filter((p) => p.date > shiftDays(last, -365));
    const divs = dividends.filter((d) => d.securityId === r.securityId);
    const lastDividend = divs.filter((d) => d.exDate <= last).sort((a, b) => b.exDate.localeCompare(a.exDate))[0];
    const nextDividend = divs.filter((d) => d.exDate > last).sort((a, b) => a.exDate.localeCompare(b.exDate))[0];
    const f = funds.get(r.securityId);
    const latestDiv = nextDividend ?? lastDividend;
    const rt = ratios(r, f, latestDiv?.amount);
    return {
      ...r,
      ch1w: changeSince(s, shiftDays(last, -7)),
      ch1m: changeSince(s, shiftDays(last, -30)),
      ch3m: changeSince(s, shiftDays(last, -91)),
      chYtd: changeSince(s, `${Number(last.slice(0, 4)) - 1}-12-31`),
      ch1y: changeSince(s, shiftDays(last, -365)),
      high52: year.length ? Math.max(...year.map((p) => p.close)) : null,
      low52: year.length ? Math.min(...year.map((p) => p.close)) : null,
      avgVolume: 0,
      lastDividend,
      nextDividend,
      fundamentals: f,
      ...rt,
    };
  });
}

/** Every listed security with variations, 52-week range, dividends and ratios. */
export function useUniverse() {
  const latest = useQuery(marketLatestQuery);
  const ids = useMemo(() => (latest.data ?? []).map((r) => r.securityId), [latest.data]);
  const hist = useQuery({ ...priceHistoryQuery(ids, MARKET_START), enabled: ids.length > 0 });
  const divs = useQuery(dividendsQuery);
  const funds = useQuery(allFundamentalsLatestQuery);
  const rows = useMemo(
    () => (latest.data && hist.data && divs.data && funds.data ? buildUniverse(latest.data, hist.data, divs.data, funds.data) : []),
    [latest.data, hist.data, divs.data, funds.data],
  );
  const lastDate = latest.data?.find((r) => r.date)?.date ?? null;
  return {
    rows,
    history: hist.data ?? new Map<string, PricePoint[]>(),
    dividends: divs.data ?? [],
    lastDate,
    loading: latest.isLoading || hist.isLoading || divs.isLoading || funds.isLoading || (ids.length > 0 && !hist.data),
    error: latest.error || hist.error || divs.error || funds.error,
  };
}
