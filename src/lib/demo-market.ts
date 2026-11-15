// Deterministic demo market data: 48 BRVM listings, one year of daily bars, indices,
// dividends and fundamentals. Same inputs always give the same numbers (no randomness),
// so SSR and the browser agree.

export const MARKET_END = "2026-11-13";
export const MARKET_START = "2025-11-13";

type Seed = [ticker: string, name: string, sector: string, country: string, last: number, shares: number];

const SEED: Seed[] = [
  ["ABJC", "Servair Abidjan Côte d'Ivoire", "Consommation discrétionnaire", "Côte d'Ivoire", 2000, 10995600],
  ["BICB", "Banque Internationale pour l'Industrie et le Commerce Bénin", "Services financiers", "Bénin", 4950, 16500000],
  ["BICC", "BICI Côte d'Ivoire", "Services financiers", "Côte d'Ivoire", 15500, 16666670],
  ["BNBC", "Bernabé Côte d'Ivoire", "Consommation discrétionnaire", "Côte d'Ivoire", 1250, 9900000],
  ["BOAB", "Bank of Africa Bénin", "Services financiers", "Bénin", 6200, 40560000],
  ["BOABF", "Bank of Africa Burkina Faso", "Services financiers", "Burkina Faso", 4300, 44000000],
  ["BOAC", "Bank of Africa Côte d'Ivoire", "Services financiers", "Côte d'Ivoire", 6900, 48000000],
  ["BOAM", "Bank of Africa Mali", "Services financiers", "Mali", 3500, 16200000],
  ["BOAN", "Bank of Africa Niger", "Services financiers", "Niger", 2750, 26000000],
  ["BOAS", "Bank of Africa Sénégal", "Services financiers", "Sénégal", 6000, 24000000],
  ["CABC", "Sicable Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 1700, 2400000],
  ["CBIBF", "Coris Bank International Burkina Faso", "Services financiers", "Burkina Faso", 10800, 32000000],
  ["CFAC", "CFAO Motors Côte d'Ivoire", "Consommation discrétionnaire", "Côte d'Ivoire", 1400, 181440000],
  ["CIEC", "Compagnie Ivoirienne d'Électricité", "Services publics", "Côte d'Ivoire", 2600, 280000000],
  ["ECOC", "Ecobank Côte d'Ivoire", "Services financiers", "Côte d'Ivoire", 15000, 55028000],
  ["ETIT", "Ecobank Transnational Incorporated", "Services financiers", "Togo", 22, 24067747000],
  ["FTSC", "Filtisac Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 2400, 8833000],
  ["LNBB", "Loterie Nationale du Bénin", "Consommation discrétionnaire", "Bénin", 3900, 20000000],
  ["NEIC", "NEI-CEDA Côte d'Ivoire", "Consommation discrétionnaire", "Côte d'Ivoire", 850, 13220000],
  ["NSBC", "NSIA Banque Côte d'Ivoire", "Services financiers", "Côte d'Ivoire", 11500, 23111100],
  ["NTLC", "Nestlé Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 11000, 22050000],
  ["ONTBF", "Onatel Burkina Faso", "Télécommunications", "Burkina Faso", 2500, 68000000],
  ["ORAC", "Orange Côte d'Ivoire", "Télécommunications", "Côte d'Ivoire", 15000, 150570000],
  ["ORGT", "Oragroup Togo", "Services financiers", "Togo", 2200, 69415000],
  ["PALC", "Palm Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 6950, 15467000],
  ["PRSC", "Tractafric Motors Côte d'Ivoire", "Consommation discrétionnaire", "Côte d'Ivoire", 3100, 1240000],
  ["SAFC", "SAFCA Alios Finance Côte d'Ivoire", "Services financiers", "Côte d'Ivoire", 3000, 2000000],
  ["SCRC", "Sucrivoire Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 1100, 19600000],
  ["SDCC", "SODECI Côte d'Ivoire", "Services publics", "Côte d'Ivoire", 6000, 90000000],
  ["SDSC", "Africa Global Logistics Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 1600, 54000000],
  ["SEMC", "Eviosys Packaging Siem Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 700, 12000000],
  ["SGBC", "Société Générale Côte d'Ivoire", "Services financiers", "Côte d'Ivoire", 28000, 31111110],
  ["SHEC", "Vivo Energy Côte d'Ivoire", "Énergie", "Côte d'Ivoire", 1000, 126000000],
  ["SIBC", "Société Ivoirienne de Banque", "Services financiers", "Côte d'Ivoire", 6500, 50000000],
  ["SICC", "SICOR Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 4000, 600000],
  ["SIVC", "Erium Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 1500, 1450000],
  ["SLBC", "Solibra Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 28000, 8000000],
  ["SMBC", "Société Multinationale de Bitumes", "Énergie", "Côte d'Ivoire", 11000, 1630000],
  ["SNTS", "Sonatel", "Télécommunications", "Sénégal", 25000, 100000000],
  ["SOGC", "SOGB Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 7000, 21601000],
  ["SPHC", "SAPH Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 6000, 25500000],
  ["STAC", "SETAO Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 1100, 1800000],
  ["STBC", "SITAB Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 18500, 17999000],
  ["SVOC", "Movis Côte d'Ivoire", "Industriels", "Côte d'Ivoire", 2000, 2500000],
  ["TTLC", "TotalEnergies Marketing Côte d'Ivoire", "Énergie", "Côte d'Ivoire", 2400, 62980000],
  ["TTLS", "TotalEnergies Marketing Sénégal", "Énergie", "Sénégal", 2500, 32560000],
  ["UNLC", "Unilever Côte d'Ivoire", "Consommation de base", "Côte d'Ivoire", 46500, 18900000],
  ["UNXC", "Uniwax Côte d'Ivoire", "Consommation discrétionnaire", "Côte d'Ivoire", 750, 20800000],
];

/** 31-bit FNV-1a hash. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h & 0x7fffffff;
}
const h01 = (s: string) => (hash(s) % 100000) / 100000;

const DAY = 86400000;
const toMs = (iso: string) => Date.parse(iso + "T00:00:00Z");
const toIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
export function addDays(iso: string, days: number) {
  return toIso(toMs(iso) + days * DAY);
}

export interface DemoSecurity {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  country: string;
  shares_outstanding: number;
  active: boolean;
}
export interface DemoBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  traded_value: number;
  bid_qty: number;
  ask_qty: number;
}
export interface DemoDividend {
  id: string;
  security_id: string;
  ex_date: string;
  pay_date: string;
  amount: number;
  fiscal_year: number;
}
export interface DemoFundamental {
  security_id: string;
  fiscal_year: number;
  revenue: number;
  gross_operating_income: number;
  net_income: number;
  equity: number;
}

interface MarketData {
  securities: DemoSecurity[];
  bars: Map<string, DemoBar[]>; // ascending
  indices: Map<string, { date: string; value: number }[]>;
  dividends: DemoDividend[];
  fundamentals: DemoFundamental[];
  calendar: string[];
}

let cache: MarketData | null = null;

export function secId(ticker: string) {
  return `sec-${ticker}`;
}

function weekdays(): string[] {
  const out: string[] = [];
  for (let t = toMs(MARKET_START); t <= toMs(MARKET_END); t += DAY) {
    const wd = new Date(t).getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(toIso(t));
  }
  return out;
}

export function market(): MarketData {
  if (cache) return cache;
  const calendar = weekdays();
  const end = toMs(MARKET_END);
  const securities: DemoSecurity[] = SEED.map(([ticker, name, sector, country, , shares]) => ({
    id: secId(ticker),
    ticker,
    name,
    sector,
    country,
    shares_outstanding: shares,
    active: true,
  }));
  const bars = new Map<string, DemoBar[]>();
  for (const [t, , , , last] of SEED) {
    const a = h01(t);
    const b = h01(t + "b");
    const round = (raw: number) => (last >= 1000 ? Math.round(raw / 5) * 5 : Math.max(1, Math.round(raw)));
    const list: DemoBar[] = calendar.map((d) => {
      const n = Math.round((end - toMs(d)) / DAY);
      const raw =
        last *
        Math.exp(
          -((a - 0.35) * 0.5) * (n / 365) +
            0.06 * (Math.sin(n / (9 + b * 20) + a * 6) - Math.sin(a * 6)) +
            0.04 * (Math.sin(n / (31 + a * 30) + b * 6) - Math.sin(b * 6)) +
            (n === 0 ? 0 : 0.015 * (h01(t + String(n)) * 2 - 1)),
        );
      const close = round(raw);
      const open = round(raw * (1 + 0.006 * Math.sin(n * 1.3 + a * 6)));
      const volume = Math.max(1, Math.round(((10_000_000 + b * 120_000_000) / last) * (0.2 + h01(t + "v" + n) * 1.8)));
      return {
        date: d,
        open,
        high: Math.max(open, close) * 1.004,
        low: Math.min(open, close) * 0.996,
        close,
        volume,
        traded_value: volume * close,
        bid_qty: n === 0 && hash(t + "r") % 3 === 0 ? hash(t + "rb") % 4000 : 0,
        ask_qty: n === 0 && hash(t + "s") % 4 === 0 ? hash(t + "sa") % 3000 : 0,
      };
    });
    bars.set(secId(t), list);
  }

  const indices = new Map<string, { date: string; value: number }[]>();
  for (const [code, last, ratio, amp] of [
    ["BRVMC", 342.15, 1.086, 0.006],
    ["BRVM30", 168.42, 1.071, 0.007],
    ["BRVMPR", 152.3, 1.094, 0.008],
  ] as const) {
    indices.set(
      code,
      calendar.map((d) => {
        const n = Math.round((end - toMs(d)) / DAY);
        const v = last * Math.exp((-Math.log(ratio) / 126) * n) * (1 + amp * Math.sin(n * 2.3) * Math.sin((Math.PI * n) / 126));
        return { date: d, value: Math.round(v * 100) / 100 };
      }),
    );
  }

  const dividends: DemoDividend[] = [];
  for (const [t, , , , last] of SEED) {
    if (last < 100) continue;
    const ex24 = addDays("2025-05-20", hash(t + "d24") % 100);
    dividends.push({ id: `div-${t}-2024`, security_id: secId(t), ex_date: ex24, pay_date: addDays(ex24, 21), amount: Math.round(last * 0.92 * (0.03 + h01(t + "y") * 0.055)), fiscal_year: 2024 });
    const upcoming = hash(t + "up") % 4 === 0;
    const ex25 = upcoming ? addDays("2026-11-18", hash(t + "d25") % 60) : addDays("2026-05-15", hash(t + "d25") % 120);
    dividends.push({ id: `div-${t}-2025`, security_id: secId(t), ex_date: ex25, pay_date: addDays(ex25, 21), amount: Math.round(last * (0.03 + h01(t + "y") * 0.055)), fiscal_year: 2025 });
  }
  dividends.sort((x, y) => y.ex_date.localeCompare(x.ex_date));

  const fundamentals: DemoFundamental[] = [];
  for (const [t, , , , last, shares] of SEED) {
    const m = 0.08 + h01(t + "m") * 0.25;
    for (let y = 2022; y <= 2025; y++) {
      const ni = ((last * shares) / (7 + (hash(t + "per") % 14))) * Math.pow(1 - (h01(t + "g") * 0.2 - 0.05), 2025 - y);
      fundamentals.push({
        security_id: secId(t),
        fiscal_year: y,
        revenue: Math.round(ni / m),
        gross_operating_income: Math.round((ni / m) * (m * 1.5 + 0.05)),
        net_income: Math.round(ni),
        equity: Math.round(ni / (0.12 + h01(t + "roe") * 0.2)),
      });
    }
  }

  cache = { securities, bars, indices, dividends, fundamentals, calendar };
  return cache;
}

/** Close of a ticker on or before a date (demo data). */
export function closeOn(ticker: string, date: string): number {
  const list = market().bars.get(secId(ticker)) ?? [];
  let best = list[0]?.close ?? 0;
  for (const b of list) {
    if (b.date > date) break;
    best = b.close;
  }
  return best;
}
