import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PricePoint } from "./engine";

export interface MarketRow {
  securityId: string;
  ticker: string;
  name: string;
  sector: string;
  country: string;
  sharesOutstanding: number;
  date: string | null;
  close: number | null;
  prevDate: string | null;
  prevClose: number | null;
  change: number | null; // fraction
  volume: number;
  tradedValue: number;
  bidQty: number;
  askQty: number;
  marketCap: number;
}

export const marketLatestQuery = queryOptions({
  queryKey: ["market", "latest"],
  staleTime: 5 * 60_000,
  queryFn: async (): Promise<MarketRow[]> => {
    const { data, error } = await supabase.rpc("market_latest");
    if (error) throw error;
    return (data ?? []).map((r) => {
      const close = r.close == null ? null : Number(r.close);
      const prev = r.prev_close == null ? null : Number(r.prev_close);
      return {
        securityId: r.security_id,
        ticker: r.ticker,
        name: r.name,
        sector: r.sector,
        country: r.country,
        sharesOutstanding: Number(r.shares_outstanding ?? 0),
        date: r.date,
        close,
        prevDate: r.prev_date,
        prevClose: prev,
        change: close != null && prev ? close / prev - 1 : null,
        volume: Number(r.volume ?? 0),
        tradedValue: Number(r.traded_value ?? 0),
        bidQty: Number(r.bid_qty ?? 0),
        askQty: Number(r.ask_qty ?? 0),
        marketCap: close != null ? close * Number(r.shares_outstanding ?? 0) : 0,
      };
    });
  },
});

export const indexSeriesQuery = (code: string) =>
  queryOptions({
    queryKey: ["market", "index", code],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<PricePoint[]> => {
      const { data, error } = await supabase.from("indices").select("date, value").eq("code", code).order("date").limit(5000);
      if (error) throw error;
      return (data ?? []).map((r) => ({ date: r.date, close: Number(r.value) }));
    },
  });

export const allIndicesLatestQuery = queryOptions({
  queryKey: ["market", "indices-latest"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const out: Record<string, { date: string; value: number; prev: number | null }> = {};
    for (const code of ["BRVMC", "BRVM30", "BRVMPR"]) {
      const { data, error } = await supabase.from("indices").select("date, value").eq("code", code).order("date", { ascending: false }).limit(2);
      if (error) throw error;
      if (data && data[0]) out[code] = { date: data[0].date, value: Number(data[0].value), prev: data[1] ? Number(data[1].value) : null };
    }
    return out;
  },
});

/** Full close history for several securities, paginated past the 1000-row API cap. */
export const priceHistoryQuery = (ids: string[], from: string) =>
  queryOptions({
    queryKey: ["market", "history", [...ids].sort().join(","), from],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Map<string, PricePoint[]>> => {
      const map = new Map<string, PricePoint[]>();
      if (ids.length === 0) return map;
      const page = 1000;
      for (let offset = 0; ; offset += page) {
        const { data, error } = await supabase
          .from("prices")
          .select("security_id, date, close")
          .in("security_id", ids)
          .gte("date", from)
          .order("security_id")
          .order("date")
          .range(offset, offset + page - 1);
        if (error) throw error;
        for (const r of data ?? []) {
          const arr = map.get(r.security_id) ?? [];
          arr.push({ date: r.date, close: Number(r.close) });
          map.set(r.security_id, arr);
        }
        if (!data || data.length < page) break;
      }
      return map;
    },
  });

export interface DividendRow {
  id: string;
  securityId: string;
  exDate: string;
  payDate: string | null;
  amount: number;
  fiscalYear: number;
}

export const dividendsQuery = queryOptions({
  queryKey: ["market", "dividends"],
  staleTime: 10 * 60_000,
  queryFn: async (): Promise<DividendRow[]> => {
    const { data, error } = await supabase.from("dividends").select("*").order("ex_date", { ascending: false }).limit(2000);
    if (error) throw error;
    return (data ?? []).map((d) => ({
      id: d.id,
      securityId: d.security_id,
      exDate: d.ex_date,
      payDate: d.pay_date,
      amount: Number(d.amount),
      fiscalYear: d.fiscal_year,
    }));
  },
});

export interface SecurityBar {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number;
  volume: number;
  tradedValue: number;
}

export const securityHistoryQuery = (securityId: string) =>
  queryOptions({
    queryKey: ["market", "security-history", securityId],
    staleTime: 5 * 60_000,
    enabled: !!securityId,
    queryFn: async (): Promise<SecurityBar[]> => {
      const { data, error } = await supabase
        .from("prices")
        .select("date, open, high, low, close, volume, traded_value")
        .eq("security_id", securityId)
        .order("date")
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: r.date,
        open: r.open == null ? null : Number(r.open),
        high: r.high == null ? null : Number(r.high),
        low: r.low == null ? null : Number(r.low),
        close: Number(r.close),
        volume: Number(r.volume),
        tradedValue: Number(r.traded_value),
      }));
    },
  });

export interface FundamentalRow {
  fiscalYear: number;
  revenue: number;
  grossOperatingIncome: number;
  netIncome: number;
  equity: number;
}

export const fundamentalsQuery = (securityId: string) =>
  queryOptions({
    queryKey: ["market", "fundamentals", securityId],
    staleTime: 30 * 60_000,
    enabled: !!securityId,
    queryFn: async (): Promise<FundamentalRow[]> => {
      const { data, error } = await supabase.from("fundamentals").select("*").eq("security_id", securityId).order("fiscal_year");
      if (error) throw error;
      return (data ?? []).map((f) => ({
        fiscalYear: f.fiscal_year,
        revenue: Number(f.revenue),
        grossOperatingIncome: Number(f.gross_operating_income),
        netIncome: Number(f.net_income),
        equity: Number(f.equity),
      }));
    },
  });

export const allFundamentalsLatestQuery = queryOptions({
  queryKey: ["market", "fundamentals-all"],
  staleTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase.from("fundamentals").select("*").eq("fiscal_year", 2025).limit(1000);
    if (error) throw error;
    const m = new Map<string, FundamentalRow>();
    for (const f of data ?? [])
      m.set(f.security_id, {
        fiscalYear: f.fiscal_year,
        revenue: Number(f.revenue),
        grossOperatingIncome: Number(f.gross_operating_income),
        netIncome: Number(f.net_income),
        equity: Number(f.equity),
      });
    return m;
  },
});

export function isBank(sector: string) {
  return sector === "Services financiers";
}

/** Ratios from the latest fiscal year. */
export function ratios(row: MarketRow, f: FundamentalRow | undefined, lastDividend: number | undefined) {
  const shares = row.sharesOutstanding || 0;
  const eps = f && shares ? f.netIncome / shares : null;
  const bvps = f && shares ? f.equity / shares : null;
  return {
    per: eps && row.close ? row.close / eps : null,
    pbr: bvps && row.close ? row.close / bvps : null,
    roe: f && f.equity ? f.netIncome / f.equity : null,
    netMargin: f && f.revenue ? f.netIncome / f.revenue : null,
    yield: lastDividend && row.close ? lastDividend / row.close : null,
    eps,
  };
}
