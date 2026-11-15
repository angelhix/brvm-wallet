import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { db as supabase } from "@/lib/local-db";
import { useAuth } from "@/hooks/use-auth";
import {
  computeHoldings,
  investorFlows,
  periodPerformance,
  simulateDaily,
  valuate,
  xirr,
  type PriceMap,
  type Tx,
  type TxType,
} from "./engine";
import { indexSeriesQuery, marketLatestQuery, priceHistoryQuery, type MarketRow } from "./market";

export interface PortfolioRow {
  id: string;
  name: string;
  cash_tracking: boolean;
  currency: string;
  created_at: string;
}
export interface SubPortfolioRow {
  id: string;
  name: string;
  portfolio_id: string;
}
export interface TxRow {
  id: string;
  portfolio_id: string;
  sub_portfolio_id: string | null;
  security_id: string | null;
  type: TxType;
  date: string;
  quantity: number;
  price: number;
  fees: number;
  amount: number;
  tax: number;
  note: string | null;
  source: string;
  created_at: string;
}

const STORAGE_KEY = "kauri.portfolio";

interface Ctx {
  portfolios: PortfolioRow[];
  portfolio: PortfolioRow | null;
  setPortfolioId: (id: string) => void;
  loading: boolean;
}
const PortfolioContext = createContext<Ctx>({ portfolios: [], portfolio: null, setPortfolioId: () => {}, loading: true });

export function usePortfoliosQuery() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolios", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<PortfolioRow[]> => {
      const { data, error } = await supabase.from("portfolios").select("*").order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const q = usePortfoliosQuery();
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    setSelected(window.localStorage.getItem(STORAGE_KEY));
  }, []);
  const portfolios = q.data ?? [];
  const portfolio = portfolios.find((p) => p.id === selected) ?? portfolios[0] ?? null;
  const value = useMemo<Ctx>(
    () => ({
      portfolios,
      portfolio,
      loading: q.isLoading,
      setPortfolioId: (id: string) => {
        window.localStorage.setItem(STORAGE_KEY, id);
        setSelected(id);
      },
    }),
    [portfolios, portfolio, q.isLoading],
  );
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  return useContext(PortfolioContext);
}

export function txQueryKey(portfolioId: string | undefined) {
  return ["transactions", portfolioId];
}

export function useTransactions() {
  const { portfolio } = usePortfolio();
  return useQuery({
    queryKey: txQueryKey(portfolio?.id),
    enabled: !!portfolio,
    queryFn: async (): Promise<TxRow[]> => {
      const rows: TxRow[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("portfolio_id", portfolio!.id)
          .order("date", { ascending: false })
          .order("created_at", { ascending: false })
          .range(offset, offset + 999);
        if (error) throw error;
        rows.push(
          ...(data ?? []).map((r: TxRow) => ({
            ...r,
            quantity: Number(r.quantity),
            price: Number(r.price),
            fees: Number(r.fees),
            amount: Number(r.amount),
            tax: Number(r.tax),
          })),
        );
        if (!data || data.length < 1000) break;
      }
      return rows;
    },
  });
}

export function useSubPortfolios() {
  const { portfolio } = usePortfolio();
  return useQuery({
    queryKey: ["sub-portfolios", portfolio?.id],
    enabled: !!portfolio,
    queryFn: async (): Promise<SubPortfolioRow[]> => {
      const { data, error } = await supabase.from("sub_portfolios").select("*").eq("portfolio_id", portfolio!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function toEngineTx(r: TxRow): Tx {
  return {
    id: r.id,
    type: r.type,
    date: r.date,
    securityId: r.security_id,
    quantity: r.quantity,
    price: r.price,
    fees: r.fees,
    amount: r.amount,
    tax: r.tax,
    subPortfolioId: r.sub_portfolio_id,
  };
}

function minusDays(iso: string, days: number) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

export function useSecurityLookup() {
  const latest = useQuery(marketLatestQuery);
  const map = useMemo(() => {
    const m = new Map<string, MarketRow>();
    for (const r of latest.data ?? []) m.set(r.securityId, r);
    return m;
  }, [latest.data]);
  return { map, rows: latest.data ?? [], query: latest };
}

/**
 * Everything the portfolio screens need, recomputed from transactions + prices.
 * `subPortfolioId` filters to one sub-portfolio; `asOf` overrides the valuation date.
 */
export function useAnalytics(opts: { subPortfolioId?: string | null; asOf?: string | null } = {}) {
  const { portfolio } = usePortfolio();
  const txQ = useTransactions();
  const cal = useQuery(indexSeriesQuery("BRVMC"));
  const { map: securities, query: latestQ } = useSecurityLookup();

  const txs = useMemo(() => {
    const all = (txQ.data ?? []).map(toEngineTx);
    return opts.subPortfolioId ? all.filter((t) => t.subPortfolioId === opts.subPortfolioId) : all;
  }, [txQ.data, opts.subPortfolioId]);

  const secIds = useMemo(() => [...new Set(txs.map((t) => t.securityId).filter(Boolean) as string[])], [txs]);
  const firstDate = useMemo(() => txs.reduce<string | null>((m, t) => (!m || t.date < m ? t.date : m), null), [txs]);
  const histQ = useQuery({ ...priceHistoryQuery(secIds, firstDate ? minusDays(firstDate, 20) : "2000-01-01"), enabled: secIds.length > 0 });

  const cashTracking = portfolio?.cash_tracking ?? true;
  const calendar = useMemo(() => (cal.data ?? []).map((p) => p.date), [cal.data]);
  const lastClose = calendar[calendar.length - 1] ?? null;
  const asOf = opts.asOf ?? lastClose;

  const result = useMemo(() => {
    if (!asOf) return null;
    const prices: PriceMap = histQ.data ?? new Map();
    const holdings = computeHoldings(txs, asOf, cashTracking);
    const valuation = valuate(holdings, prices, asOf);
    const daily = simulateDaily(txs, calendar.filter((d) => d <= asOf), prices, cashTracking);
    const rate = holdings.firstDate ? xirr(investorFlows(txs, asOf, valuation.totalValue, cashTracking)) : null;
    const periods = periodPerformance(daily);
    return { prices, holdings, valuation, daily, annualized: rate, periods };
  }, [txs, histQ.data, calendar, asOf, cashTracking]);

  const loading = txQ.isLoading || cal.isLoading || latestQ.isLoading || (secIds.length > 0 && histQ.isLoading);
  return {
    portfolio,
    txs,
    rawTxs: txQ.data ?? [],
    securities,
    calendar,
    benchmark: cal.data ?? [],
    lastClose,
    asOf,
    cashTracking,
    loading,
    error: txQ.error || cal.error || histQ.error || latestQ.error,
    ...(result ?? { prices: new Map() as PriceMap, holdings: null, valuation: null, daily: [], annualized: null, periods: [] }),
  };
}
