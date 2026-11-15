/**
 * Portfolio calculation engine — pure functions, no I/O.
 * All money amounts are integer FCFA; unit prices may carry decimals.
 * Cost method: weighted average cost (prix de revient unitaire, fees included).
 */
export type TxType = "acquisition" | "cession" | "depot" | "retrait" | "dividende" | "frais";

export interface Tx {
  id: string;
  type: TxType;
  date: string; // YYYY-MM-DD
  securityId: string | null;
  quantity: number;
  price: number;
  fees: number;
  amount: number; // deposit / withdrawal / gross dividend / standalone fee
  tax: number; // IRVM withheld on a dividend
  subPortfolioId?: string | null;
}

export interface PricePoint {
  date: string;
  close: number;
}
export type PriceMap = Map<string, PricePoint[]>; // ascending by date

const TYPE_ORDER: Record<TxType, number> = { depot: 0, acquisition: 1, cession: 2, dividende: 3, frais: 4, retrait: 5 };

export function sortTxs(txs: Tx[]): Tx[] {
  return [...txs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : TYPE_ORDER[a.type] - TYPE_ORDER[b.type]));
}

export function grossAmount(tx: Tx): number {
  return Math.round(tx.quantity * tx.price);
}

/** Effect of a transaction on the cash balance (liquidité). */
export function cashEffect(tx: Tx): number {
  switch (tx.type) {
    case "acquisition":
      return -(grossAmount(tx) + tx.fees);
    case "cession":
      return grossAmount(tx) - tx.fees;
    case "depot":
      return tx.amount;
    case "retrait":
      return -tx.amount;
    case "dividende":
      return tx.amount - tx.tax;
    case "frais":
      return -tx.amount;
  }
}

/** "Entrée" (cash in) or "Sortie" (cash out) of the cash account. */
export function flowDirection(tx: Tx): "Entrée" | "Sortie" {
  return cashEffect(tx) >= 0 ? "Entrée" : "Sortie";
}

/** Fee as a fraction of the gross operation amount (0.001 = 0,10 %). */
export function feeRatio(tx: Pick<Tx, "quantity" | "price" | "fees">): number {
  const g = tx.quantity * tx.price;
  return g > 0 ? tx.fees / g : 0;
}

/** Contribution change caused by the tx, from the investor's point of view. */
function contributionEffect(tx: Tx, cashTracking: boolean): number {
  if (cashTracking) {
    if (tx.type === "depot") return tx.amount;
    if (tx.type === "retrait") return -tx.amount;
    return 0;
  }
  if (tx.type === "depot" || tx.type === "retrait") return 0;
  // Without cash tracking every operation is an implicit deposit / withdrawal.
  return -cashEffect(tx);
}

export interface Position {
  securityId: string;
  quantity: number;
  cost: number; // remaining cost basis, fees included
  realized: number;
  dividends: number; // net of IRVM
  dividendsTax: number;
  fees: number;
  bought: number;
  sold: number;
  openedOn: string | null; // start date of the current holding period
}

export interface ClosedLot {
  txId: string;
  securityId: string;
  date: string;
  quantity: number;
  costBasis: number;
  proceeds: number; // net of fees
  gain: number;
  openedOn: string | null;
}

export interface Holdings {
  positions: Map<string, Position>;
  cash: number;
  netContributions: number;
  deposits: number;
  withdrawals: number;
  realized: number;
  dividendsNet: number;
  dividendsTax: number;
  fees: number;
  closedLots: ClosedLot[];
  firstDate: string | null;
  txCount: number;
}

function emptyPosition(securityId: string): Position {
  return { securityId, quantity: 0, cost: 0, realized: 0, dividends: 0, dividendsTax: 0, fees: 0, bought: 0, sold: 0, openedOn: null };
}

export function emptyHoldings(): Holdings {
  return {
    positions: new Map(),
    cash: 0,
    netContributions: 0,
    deposits: 0,
    withdrawals: 0,
    realized: 0,
    dividendsNet: 0,
    dividendsTax: 0,
    fees: 0,
    closedLots: [],
    firstDate: null,
    txCount: 0,
  };
}

/** Mutates `h` by applying one transaction. */
export function applyTx(h: Holdings, tx: Tx, cashTracking: boolean): void {
  if (!h.firstDate || tx.date < h.firstDate) h.firstDate = tx.date;
  h.txCount += 1;
  const eff = cashEffect(tx);
  if (cashTracking) h.cash += eff;
  h.netContributions += contributionEffect(tx, cashTracking);

  const pos = () => {
    const id = tx.securityId as string;
    let p = h.positions.get(id);
    if (!p) {
      p = emptyPosition(id);
      h.positions.set(id, p);
    }
    return p;
  };

  switch (tx.type) {
    case "depot":
      h.deposits += tx.amount;
      break;
    case "retrait":
      h.withdrawals += tx.amount;
      break;
    case "frais":
      h.fees += tx.amount;
      break;
    case "acquisition": {
      const p = pos();
      if (p.quantity <= 1e-9) p.openedOn = tx.date;
      p.quantity += tx.quantity;
      p.cost += grossAmount(tx) + tx.fees;
      p.fees += tx.fees;
      p.bought += grossAmount(tx) + tx.fees;
      h.fees += tx.fees;
      break;
    }
    case "cession": {
      const p = pos();
      const q = Math.min(tx.quantity, p.quantity);
      const costBasis = p.quantity > 0 ? Math.round((p.cost * q) / p.quantity) : 0;
      const proceeds = grossAmount(tx) - tx.fees;
      const gain = proceeds - costBasis;
      p.quantity -= q;
      p.cost -= costBasis;
      if (p.quantity <= 1e-9) {
        p.quantity = 0;
        p.cost = 0;
      }
      p.realized += gain;
      p.fees += tx.fees;
      p.sold += proceeds;
      h.realized += gain;
      h.fees += tx.fees;
      h.closedLots.push({ txId: tx.id, securityId: p.securityId, date: tx.date, quantity: q, costBasis, proceeds, gain, openedOn: p.openedOn });
      if (p.quantity === 0) p.openedOn = null;
      break;
    }
    case "dividende": {
      const p = pos();
      p.dividends += tx.amount - tx.tax;
      p.dividendsTax += tx.tax;
      h.dividendsNet += tx.amount - tx.tax;
      h.dividendsTax += tx.tax;
      break;
    }
  }
}

export function computeHoldings(txs: Tx[], asOf: string | null, cashTracking = true): Holdings {
  const h = emptyHoldings();
  for (const tx of sortTxs(txs)) {
    if (asOf && tx.date > asOf) break;
    applyTx(h, tx, cashTracking);
  }
  return h;
}

/** Last known close on or before `date`. */
export function priceAt(prices: PriceMap, securityId: string, date: string): number | null {
  const s = prices.get(securityId);
  if (!s || s.length === 0) return null;
  let lo = 0;
  let hi = s.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (s[mid]!.date <= date) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans >= 0 ? s[ans]!.close : null;
}

export interface PositionValue extends Position {
  lastPrice: number | null;
  value: number;
  unitCost: number;
  unrealized: number;
  unrealizedPct: number;
  weight: number;
}

export interface Valuation {
  positions: PositionValue[];
  securitiesValue: number;
  investedCapital: number;
  cash: number;
  totalValue: number;
  netContributions: number;
  gain: number;
  unrealized: number;
  realized: number;
  dividendsNet: number;
  fees: number;
}

export function valuate(h: Holdings, prices: PriceMap, date: string): Valuation {
  const open = [...h.positions.values()].filter((p) => p.quantity > 1e-9);
  let securitiesValue = 0;
  let investedCapital = 0;
  const rows = open.map((p) => {
    const unitCost = p.quantity > 0 ? p.cost / p.quantity : 0;
    const last = priceAt(prices, p.securityId, date);
    const value = Math.round(p.quantity * (last ?? unitCost));
    securitiesValue += value;
    investedCapital += p.cost;
    return { ...p, lastPrice: last, value, unitCost, unrealized: value - p.cost, unrealizedPct: p.cost > 0 ? (value - p.cost) / p.cost : 0, weight: 0 };
  });
  for (const r of rows) r.weight = securitiesValue > 0 ? r.value / securitiesValue : 0;
  rows.sort((a, b) => b.value - a.value);
  const totalValue = securitiesValue + h.cash;
  return {
    positions: rows,
    securitiesValue,
    investedCapital,
    cash: h.cash,
    totalValue,
    netContributions: h.netContributions,
    gain: totalValue - h.netContributions,
    unrealized: securitiesValue - investedCapital,
    realized: h.realized,
    dividendsNet: h.dividendsNet,
    fees: h.fees,
  };
}

// ---------- Annualised return (TRI / XIRR) ----------
export interface Flow {
  date: string;
  amount: number; // investor perspective: money put in is negative
}

function dayDiff(a: string, b: string): number {
  return (Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000;
}
export { dayDiff };

export function xirr(flows: Flow[]): number | null {
  const fs = flows.filter((f) => f.amount !== 0).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (fs.length < 2) return null;
  if (!fs.some((f) => f.amount > 0) || !fs.some((f) => f.amount < 0)) return null;
  const t0 = fs[0]!.date;
  const ts = fs.map((f) => dayDiff(t0, f.date) / 365);
  const npv = (r: number) => fs.reduce((s, f, i) => s + f.amount / Math.pow(1 + r, ts[i]!), 0);
  // Bisection on a bracket — robust for typical portfolio flows.
  let lo = -0.9999;
  let hi = 10;
  let flo = npv(lo);
  let fhi = npv(hi);
  if (flo * fhi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fm = npv(mid);
    if (Math.abs(fm) < 1e-6) return mid;
    if (flo * fm < 0) {
      hi = mid;
      fhi = fm;
    } else {
      lo = mid;
      flo = fm;
    }
  }
  return (lo + hi) / 2;
}

export function investorFlows(txs: Tx[], asOf: string, finalValue: number, cashTracking = true): Flow[] {
  const flows: Flow[] = [];
  for (const tx of txs) {
    if (tx.date > asOf) continue;
    const c = contributionEffect(tx, cashTracking);
    if (c !== 0) flows.push({ date: tx.date, amount: -c });
  }
  flows.push({ date: asOf, amount: finalValue });
  return flows;
}

// ---------- Daily simulation & base-100 index ----------
export interface DailyPoint {
  date: string;
  securitiesValue: number;
  cash: number;
  value: number;
  contributions: number;
  flow: number; // contributions change since previous point (F_t)
  gain: number;
  index: number; // base 100, contributions neutralised (unit value method)
}

/**
 * Walks the trading calendar from the first transaction to the end, applying
 * transactions incrementally. I_t = I_{t-1} × (V_t − F_t) / V_{t-1}.
 */
export function simulateDaily(txs: Tx[], calendar: string[], prices: PriceMap, cashTracking = true): DailyPoint[] {
  const sorted = sortTxs(txs);
  if (sorted.length === 0) return [];
  const first = sorted[0]!.date;
  const days = calendar.filter((d) => d >= first);
  const h = emptyHoldings();
  let i = 0;
  const out: DailyPoint[] = [];
  let prev: DailyPoint | null = null;
  for (const day of days) {
    while (i < sorted.length && sorted[i]!.date <= day) applyTx(h, sorted[i++]!, cashTracking);
    let sv = 0;
    for (const p of h.positions.values()) {
      if (p.quantity <= 1e-9) continue;
      const px = priceAt(prices, p.securityId, day);
      sv += Math.round(p.quantity * (px ?? p.cost / p.quantity));
    }
    const value = sv + h.cash;
    const flow = prev ? h.netContributions - prev.contributions : h.netContributions;
    let index = 100;
    if (prev) index = prev.value > 0 ? (prev.index * (value - flow)) / prev.value : prev.index;
    const pt: DailyPoint = { date: day, securitiesValue: sv, cash: h.cash, value, contributions: h.netContributions, flow, gain: value - h.netContributions, index };
    out.push(pt);
    prev = pt;
  }
  return out;
}

/** Rebases a benchmark series to 100 at `start` (first point on/after start). */
export function rebase(series: PricePoint[], start: string): PricePoint[] {
  const s = series.filter((p) => p.date >= start);
  if (s.length === 0) return [];
  const base = s[0]!.close;
  return s.map((p) => ({ date: p.date, close: (p.close / base) * 100 }));
}

export interface PeriodResult {
  key: string;
  label: string;
  from: string | null;
  gain: number;
  pct: number;
}

/** Point just before a given date (exclusive), or a virtual origin. */
function baselineBefore(daily: DailyPoint[], date: string): { gain: number; index: number } {
  let b: DailyPoint | null = null;
  for (const p of daily) {
    if (p.date < date) b = p;
    else break;
  }
  return b ? { gain: b.gain, index: b.index } : { gain: 0, index: 100 };
}

export function periodPerformance(daily: DailyPoint[]): PeriodResult[] {
  if (daily.length === 0) return [];
  const last = daily[daily.length - 1]!;
  const n = daily.length;
  const y = Number(last.date.slice(0, 4));
  const m = Number(last.date.slice(5, 7));
  const q0 = Math.floor((m - 1) / 3) * 3 + 1;
  const pad = (v: number) => String(v).padStart(2, "0");
  const mk = (key: string, label: string, base: { gain: number; index: number }, from: string | null): PeriodResult => ({
    key,
    label,
    from,
    gain: last.gain - base.gain,
    pct: base.index > 0 ? last.index / base.index - 1 : 0,
  });
  const prevDay = n >= 2 ? daily[n - 2]! : null;
  const weekBase = n >= 8 ? daily[n - 8]! : null;
  return [
    mk("today", "Aujourd'hui", prevDay ? { gain: prevDay.gain, index: prevDay.index } : { gain: 0, index: 100 }, prevDay?.date ?? null),
    mk("week", "Cette semaine", weekBase ? { gain: weekBase.gain, index: weekBase.index } : { gain: 0, index: 100 }, weekBase?.date ?? null),
    mk("month", "Ce mois", baselineBefore(daily, `${y}-${pad(m)}-01`), `${y}-${pad(m)}-01`),
    mk("quarter", "Trimestre", baselineBefore(daily, `${y}-${pad(q0)}-01`), `${y}-${pad(q0)}-01`),
    mk("year", "Année", baselineBefore(daily, `${y}-01-01`), `${y}-01-01`),
    mk("total", "Depuis l'origine", { gain: 0, index: 100 }, daily[0]!.date),
  ];
}

export interface DayGain {
  date: string;
  gain: number;
}

export function dailyGains(daily: DailyPoint[]): DayGain[] {
  return daily.map((p, i) => ({ date: p.date, gain: i === 0 ? p.gain : p.gain - daily[i - 1]!.gain }));
}

export function gainStats(days: DayGain[]) {
  if (days.length === 0) return null;
  let best = days[0]!;
  let worst = days[0]!;
  let total = 0;
  let pos = 0;
  let neg = 0;
  for (const d of days) {
    if (d.gain > best.gain) best = d;
    if (d.gain < worst.gain) worst = d;
    total += d.gain;
    if (d.gain > 0) pos++;
    else if (d.gain < 0) neg++;
  }
  return { best, worst, total, average: total / days.length, positive: pos, negative: neg, count: days.length };
}

/** Gain per security between two dates (exclusive start, inclusive end). */
export function securityGains(txs: Tx[], prices: PriceMap, from: string | null, to: string, cashTracking = true) {
  const start = from ? computeHoldings(txs, from, cashTracking) : emptyHoldings();
  const end = computeHoldings(txs, to, cashTracking);
  const ids = new Set<string>([...start.positions.keys(), ...end.positions.keys()]);
  const res: { securityId: string; startValue: number; endValue: number; netFlows: number; gain: number }[] = [];
  for (const id of ids) {
    const sp = start.positions.get(id);
    const ep = end.positions.get(id);
    const sv = sp && sp.quantity > 0 && from ? Math.round(sp.quantity * (priceAt(prices, id, from) ?? sp.cost / sp.quantity)) : 0;
    const evv = ep && ep.quantity > 0 ? Math.round(ep.quantity * (priceAt(prices, id, to) ?? ep.cost / ep.quantity)) : 0;
    let netFlows = 0; // cash received from the line minus cash put in during the period
    for (const tx of txs) {
      if (tx.securityId !== id) continue;
      if ((from && tx.date <= from) || tx.date > to) continue;
      if (tx.type === "acquisition" || tx.type === "cession" || tx.type === "dividende") netFlows += cashEffect(tx);
    }
    const gain = evv - sv + netFlows;
    if (sv === 0 && evv === 0 && netFlows === 0) continue;
    res.push({ securityId: id, startValue: sv, endValue: evv, netFlows, gain });
  }
  return res.sort((a, b) => b.gain - a.gain);
}

/** Dividend yield = dividend per share / reference price. */
export function dividendYield(dividendPerShare: number, referencePrice: number): number {
  return referencePrice > 0 ? dividendPerShare / referencePrice : 0;
}
