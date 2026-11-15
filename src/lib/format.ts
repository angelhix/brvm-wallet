// Number formatting rules: narrow no-break space thousands separator, decimal comma,
// typographic minus sign (U+2212), "FCFA" / "%" suffix.
const NNBSP = "\u202F";
const MINUS = "\u2212";

function normalize(s: string): string {
  return s.replace(/[\u00A0\u202F\s]/g, NNBSP).replace(/^-/, MINUS).replace(/-/g, MINUS);
}

export function fmtNum(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const v = Object.is(Math.round(n * 10 ** decimals), -0) ? 0 : n;
  return normalize(
    new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v),
  );
}

export function fmtFCFA(n: number | null | undefined, opts: { signed?: boolean | undefined; decimals?: number | undefined } = {}): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const body = fmtNum(Math.abs(n), opts.decimals ?? 0);
  const sign = n < 0 && Math.round(Math.abs(n)) !== 0 ? MINUS : opts.signed && n > 0 ? "+" : "";
  return `${sign}${body}${NNBSP}FCFA`;
}

/** ratio = 0.0125 -> "1,25 %" */
export function fmtPct(ratio: number | null | undefined, opts: { signed?: boolean | undefined; decimals?: number | undefined } = {}): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  const decimals = opts.decimals ?? 2;
  const pct = ratio * 100;
  const rounded = Number(pct.toFixed(decimals));
  const sign = rounded < 0 ? MINUS : opts.signed && rounded > 0 ? "+" : "";
  return `${sign}${fmtNum(Math.abs(pct), decimals)}${NNBSP}%`;
}

export function fmtSigned(n: number | null | undefined, decimals = 0): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const r = Number(n.toFixed(decimals));
  return `${r > 0 ? "+" : r < 0 ? MINUS : ""}${fmtNum(Math.abs(n), decimals)}`;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

export function fmtDayMonth(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function monthLabel(year: number, month0: number): string {
  return `${MONTHS[month0]} ${year}`;
}
export const MONTH_SHORT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function toneOf(n: number | null | undefined): "gain" | "loss" | "flat" {
  if (n == null || !Number.isFinite(n)) return "flat";
  if (n > 0.0000001) return "gain";
  if (n < -0.0000001) return "loss";
  return "flat";
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
