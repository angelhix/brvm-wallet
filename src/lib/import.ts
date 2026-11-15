import type { TxType } from "./engine";

export interface ParsedRow {
  line: number;
  date: string | null;
  type: TxType | null;
  ticker: string | null;
  quantity: number;
  price: number;
  fees: number;
  amount: number;
  tax: number;
  note: string | null;
  errors: string[];
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]/g, "");

const HEADER_ALIASES: Record<string, string[]> = {
  date: ["date", "dateoperation", "dateop", "datedelop", "jour"],
  type: ["type", "operation", "nature", "sens", "libelleoperation"],
  ticker: ["ticker", "titre", "symbole", "code", "valeur", "codevaleur"],
  quantity: ["quantite", "qte", "qty", "nombre", "nbtitres"],
  price: ["prix", "prixunitaire", "cours", "pu", "coursunitaire"],
  fees: ["frais", "commission", "commissions", "courtage"],
  amount: ["montant", "montantnet", "net", "somme"],
  tax: ["irvm", "taxe", "impot", "retenue"],
  note: ["note", "commentaire", "libelle", "description"],
};

export function mapHeaders(headers: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  headers.forEach((h, i) => {
    const n = norm(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (out[field] === undefined && aliases.includes(n)) out[field] = i;
    }
  });
  return out;
}

export function parseType(raw: string): TxType | null {
  const n = norm(raw);
  if (!n) return null;
  if (/^(achat|acquisition|buy|souscription)/.test(n)) return "acquisition";
  if (/^(vente|cession|sell)/.test(n)) return "cession";
  if (/^(depot|versement|apport|virementrecu|deposit)/.test(n)) return "depot";
  if (/^(retrait|withdraw)/.test(n)) return "retrait";
  if (/^(dividende|coupon|dividend)/.test(n)) return "dividende";
  if (/^(frais|droitsdegarde|tenuedecompte|fee)/.test(n)) return "frais";
  return null;
}

/** "1 234,50" | "1234.5" | "1.234,50" -> number. Empty -> 0. */
export function parseNumber(raw: string): number | null {
  const s = raw.replace(/[\s\u00A0\u202F]|FCFA|XOF|F\b/gi, "").replace(/\u2212/g, "-");
  if (!s) return 0;
  let t = s;
  if (t.includes(",") && t.includes(".")) t = t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  else if (t.includes(",")) t = t.replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** dd/mm/yyyy, dd-mm-yyyy, yyyy-mm-dd -> ISO date, or null. */
export function parseDate(raw: string): string | null {
  const s = raw.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return iso(+m[1]!, +m[2]!, +m[3]!);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    const y = m[3]!.length === 2 ? 2000 + +m[3]! : +m[3]!;
    return iso(y, +m[2]!, +m[1]!);
  }
  return null;
}
function iso(y: number, mo: number, d: number) {
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1) return null;
  return dt.toISOString().slice(0, 10);
}

export function parseRows(table: string[][], knownTickers: Set<string>): { rows: ParsedRow[]; missing: string[] } {
  const [head, ...body] = table;
  const map = mapHeaders(head ?? []);
  const missing = ["date", "type"].filter((f) => map[f] === undefined);
  const get = (r: string[], f: string) => (map[f] === undefined ? "" : (r[map[f]!] ?? ""));
  const rows: ParsedRow[] = [];
  body.forEach((r, i) => {
    if (r.every((c) => !c)) return;
    const errors: string[] = [];
    const date = parseDate(get(r, "date"));
    if (!date) errors.push("Date illisible");
    const type = parseType(get(r, "type"));
    if (!type) errors.push("Type inconnu");
    const tickerRaw = get(r, "ticker").toUpperCase().trim();
    const ticker = tickerRaw || null;
    const num = (f: string) => {
      const v = parseNumber(get(r, f));
      if (v === null) errors.push(`${f} illisible`);
      return Math.abs(v ?? 0);
    };
    const quantity = num("quantity");
    const price = num("price");
    const fees = num("fees");
    let amount = num("amount");
    const tax = num("tax");
    if (type === "acquisition" || type === "cession" || type === "dividende") {
      if (!ticker) errors.push("Titre manquant");
      else if (!knownTickers.has(ticker)) errors.push(`Titre ${ticker} inconnu`);
    }
    if ((type === "acquisition" || type === "cession") && (quantity <= 0 || price <= 0)) errors.push("Quantité et prix requis");
    if (type === "dividende" && amount <= 0 && quantity > 0 && price > 0) amount = Math.round(quantity * price);
    if ((type === "depot" || type === "retrait" || type === "dividende" || type === "frais") && amount <= 0) errors.push("Montant requis");
    rows.push({ line: i + 2, date, type, ticker, quantity, price, fees: Math.round(fees), amount: Math.round(amount), tax: Math.round(tax), note: get(r, "note") || null, errors });
  });
  return { rows, missing };
}

/** Re-validates a row after it was edited on the verification screen. */
export function checkRow(row: Omit<ParsedRow, "errors">, knownTickers: Set<string>): string[] {
  const errors: string[] = [];
  if (!row.date) errors.push("Date illisible");
  if (!row.type) errors.push("Type inconnu");
  const t = row.type;
  if (t === "acquisition" || t === "cession" || t === "dividende") {
    if (!row.ticker) errors.push("Titre manquant");
    else if (!knownTickers.has(row.ticker)) errors.push(`Titre ${row.ticker} inconnu`);
  }
  if ((t === "acquisition" || t === "cession") && (row.quantity <= 0 || row.price <= 0)) errors.push("Quantité et prix requis");
  if ((t === "depot" || t === "retrait" || t === "dividende" || t === "frais") && row.amount <= 0) errors.push("Montant requis");
  return errors;
}

/** Splits text pasted from a PDF statement or spreadsheet (tabs, semicolons or 2+ spaces). */
export function splitPasted(text: string): string[][] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sep = lines.some((l) => l.includes("\t")) ? /\t/ : lines.some((l) => l.includes(";")) ? /;/ : /\s{2,}/;
  return lines.map((l) => l.split(sep).map((c) => c.trim()));
}

/** Cash vs securities split of the rows that will be imported. */
export function importSummary(rows: Pick<ParsedRow, "type" | "quantity" | "price" | "fees" | "amount" | "tax">[]) {
  const s = { deposits: 0, withdrawals: 0, buys: 0, sells: 0, dividends: 0, fees: 0, count: rows.length };
  for (const r of rows) {
    if (r.type === "depot") s.deposits += r.amount;
    if (r.type === "retrait") s.withdrawals += r.amount;
    if (r.type === "acquisition") { s.buys += r.quantity * r.price; s.fees += r.fees; }
    if (r.type === "cession") { s.sells += r.quantity * r.price; s.fees += r.fees; }
    if (r.type === "dividende") s.dividends += r.amount - r.tax;
    if (r.type === "frais") s.fees += r.amount;
  }
  return { ...s, netCash: s.deposits - s.withdrawals - s.buys + s.sells + s.dividends - s.fees };
}
