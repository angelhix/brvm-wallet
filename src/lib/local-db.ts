// Browser-side demo store. Mimics the small slice of a hosted database client the app uses
// (from().select/insert/update/delete/upsert + filters, auth, rpc) and keeps everything in
// localStorage, so every page works without a backend. Ownership rules mirror row-level
// security: users only see their own rows; admins also see profiles, roles, appointments,
// referrals and contact messages.
import { addDays, closeOn, market, secId } from "./demo-market";

type Row = Record<string, any>;
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  user_metadata: Record<string, unknown>;
}
export interface Session {
  user: AuthUser;
  access_token: string;
}
interface StoredUser extends AuthUser {
  password: string;
  suspended?: boolean;
}
interface State {
  version: number;
  users: StoredUser[];
  session: { userId: string } | null;
  tables: Record<string, Row[]>;
}

const KEY = "kauri.demo-db";
const VERSION = 3;
export const DEMO_EMAIL = "demo@kauri.app";
export const DEMO_PASSWORD = "kauri2026";

const OWN_ONLY: Record<string, string> = { portfolios: "user_id", sub_portfolios: "user_id", transactions: "user_id", tour_progress: "user_id", imports: "user_id" };
const OWN_OR_ADMIN: Record<string, string> = { profiles: "id", user_roles: "user_id", appointments: "user_id", referrals: "referrer_id" };
const ADMIN_ONLY = new Set(["contact_messages", "audit_log"]);
const PUBLIC_INSERT = new Set(["contact_messages"]);

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toISOString();
const code8 = () => uid().replace(/-/g, "").slice(0, 8).toUpperCase();

// ---------- seed ----------
function seed(): State {
  const t: Record<string, Row[]> = {
    profiles: [], user_roles: [], portfolios: [], sub_portfolios: [], transactions: [], tour_progress: [],
    contact_messages: [], referrals: [], appointments: [], imports: [], audit_log: [],
  };
  const users: StoredUser[] = [];
  const addUser = (email: string, first: string, created: string, opts: { role?: "admin" | "user"; ref?: string; code?: string; lastSeen?: string } = {}) => {
    const id = email === DEMO_EMAIL ? "user-demo" : "user-" + email.split("@")[0]!.replace(/[^a-z0-9]/gi, "");
    users.push({ id, email, password: DEMO_PASSWORD, created_at: created, last_sign_in_at: opts.lastSeen ?? created, user_metadata: { first_name: first } });
    t.profiles!.push({ id, email, first_name: first, referral_code: opts.code ?? code8(), referred_by: opts.ref ?? null, created_at: created });
    t.user_roles!.push({ id: uid(), user_id: id, role: opts.role ?? "user" });
    const pid = "pf-" + id;
    t.portfolios!.push({ id: pid, user_id: id, name: "Mon portefeuille", cash_tracking: true, currency: "XOF", created_at: created });
    return { id, pid };
  };

  const demo = addUser(DEMO_EMAIL, "Awa", "2025-11-28T09:12:00.000Z", { role: "admin", code: "AWA2026K", lastSeen: now() });
  const sub = { id: "sub-dividendes", user_id: demo.id, portfolio_id: demo.pid, name: "Rendement", created_at: "2025-12-01T10:00:00.000Z" };
  t.sub_portfolios!.push(sub);

  const tx = (userId: string, pid: string, r: Partial<Row> & { type: string; date: string }) =>
    t.transactions!.push({
      id: uid(), user_id: userId, portfolio_id: pid, sub_portfolio_id: null, security_id: null,
      quantity: 0, price: 0, fees: 0, amount: 0, tax: 0, note: null, source: "saisie", created_at: r.date + "T12:00:00.000Z", ...r,
    });
  const buy = (userId: string, pid: string, date: string, ticker: string, q: number, extra: Partial<Row> = {}) => {
    const price = closeOn(ticker, date);
    tx(userId, pid, { type: "acquisition", date, security_id: secId(ticker), quantity: q, price, fees: Math.round(q * price * 0.012), ...extra });
  };
  const sell = (userId: string, pid: string, date: string, ticker: string, q: number) => {
    const price = closeOn(ticker, date);
    tx(userId, pid, { type: "cession", date, security_id: secId(ticker), quantity: q, price, fees: Math.round(q * price * 0.012) });
  };

  // Demo investor
  const D = demo.id, P = demo.pid;
  tx(D, P, { type: "depot", date: "2025-12-01", amount: 3_000_000, note: "Versement initial" });
  buy(D, P, "2025-12-02", "SNTS", 40, { sub_portfolio_id: sub.id });
  buy(D, P, "2025-12-02", "ORAC", 30, { sub_portfolio_id: sub.id });
  buy(D, P, "2026-01-15", "SGBC", 20);
  buy(D, P, "2026-02-10", "PALC", 50);
  tx(D, P, { type: "depot", date: "2026-03-05", amount: 1_000_000 });
  buy(D, P, "2026-03-06", "SIBC", 60);
  buy(D, P, "2026-04-20", "BOAC", 80);
  sell(D, P, "2026-07-10", "PALC", 25);
  tx(D, P, { type: "frais", date: "2026-09-01", amount: 12_000, note: "Droits de garde" });
  buy(D, P, "2026-10-01", "UNLC", 5);
  const held: Record<string, { q: number; from: string }> = {
    SNTS: { q: 40, from: "2025-12-02" }, ORAC: { q: 30, from: "2025-12-02" }, SGBC: { q: 20, from: "2026-01-15" },
    PALC: { q: 50, from: "2026-02-10" }, SIBC: { q: 60, from: "2026-03-06" }, BOAC: { q: 80, from: "2026-04-20" },
  };
  for (const d of market().dividends) {
    const tk = d.security_id.slice(4);
    const h = held[tk];
    if (!h || d.ex_date <= h.from || d.pay_date > "2026-11-13") continue;
    const q = tk === "PALC" && d.ex_date > "2026-07-10" ? 25 : h.q;
    const amount = q * d.amount;
    const rate = tk === "SNTS" ? 0.1 : 0.1;
    tx(D, P, { type: "dividende", date: d.pay_date, security_id: d.security_id, quantity: q, price: d.amount, amount, tax: Math.round(amount * rate), sub_portfolio_id: tk === "SNTS" || tk === "ORAC" ? sub.id : null });
  }
  t.tour_progress!.push(...["dashboard", "portefeuille", "transactions", "fiche", "screener", "sous-portefeuilles"].map((zone) => ({ user_id: D, zone, seen_at: "2025-12-01T10:00:00.000Z" })));
  t.imports!.push({ id: uid(), user_id: D, filename: "releve-sgi-decembre.csv", status: "validé", rows_read: 4, rows_imported: 4, errors: [], created_at: "2025-12-03T08:30:00.000Z" });

  // Other members (for referrals and the back-office)
  const others: [string, string, string, boolean, string][] = [
    ["kofi.mensah@gmail.com", "Kofi", "2026-01-08T14:22:00.000Z", true, "2026-11-12T19:02:00.000Z"],
    ["fatou.diop@yahoo.fr", "Fatou", "2026-02-14T08:05:00.000Z", true, "2026-11-14T07:41:00.000Z"],
    ["ibrahim.traore@outlook.com", "Ibrahim", "2026-03-21T17:40:00.000Z", true, "2026-10-30T12:15:00.000Z"],
    ["aminata.kone@gmail.com", "Aminata", "2026-05-03T11:11:00.000Z", false, "2026-11-13T21:20:00.000Z"],
    ["yao.kouassi@gmail.com", "Yao", "2026-08-19T09:30:00.000Z", false, "2026-09-02T10:00:00.000Z"],
    ["mariam.sow@orange.sn", "Mariam", "2026-10-27T16:48:00.000Z", true, "2026-11-15T08:10:00.000Z"],
  ];
  others.forEach(([email, first, created, referred, last], i) => {
    const u = addUser(email, first, created, { ref: referred ? D : undefined, lastSeen: last });
    tx(u.id, u.pid, { type: "depot", date: created.slice(0, 10), amount: 500_000 + i * 250_000 });
    if (i % 2 === 0) buy(u.id, u.pid, addDays(created.slice(0, 10), 2) > "2026-11-13" ? "2026-11-13" : addDays(created.slice(0, 10), 2), ["SNTS", "ORAC", "SGBC"][i % 3]!, 5 + i);
    if (referred) {
      t.referrals!.push({ id: uid(), referrer_id: D, referred_id: u.id, referred_label: email.slice(0, 2) + "•••@" + email.split("@")[1], created_at: created });
    }
  });
  users.find((u) => u.email === "yao.kouassi@gmail.com")!.suspended = true;

  t.contact_messages!.push(
    { id: uid(), name: "Kofi Mensah", email: "kofi.mensah@gmail.com", subject: "Import du relevé de ma SGI", message: "Bonjour, mon relevé Excel a des colonnes « Libellé » et « Montant net ». Est-ce que l'import les reconnaît ?", handled: false, created_at: "2026-11-14T10:24:00.000Z" },
    { id: uid(), name: "Fatou Diop", email: "fatou.diop@yahoo.fr", subject: "Dividende SONATEL", message: "Le dividende de Sonatel n'apparaît pas encore dans mon calendrier, est-ce normal ?", handled: false, created_at: "2026-11-12T18:03:00.000Z" },
    { id: uid(), name: "Moussa Camara", email: "m.camara@gmail.com", subject: "Partenariat", message: "Je travaille pour une SGI à Dakar et j'aimerais discuter d'un partenariat de contenu.", handled: true, created_at: "2026-11-02T09:41:00.000Z" },
    { id: uid(), name: "Aminata Koné", email: "aminata.kone@gmail.com", subject: "Suppression d'un sous-portefeuille", message: "Si je supprime un sous-portefeuille, est-ce que je perds mes transactions ?", handled: true, created_at: "2026-10-25T13:12:00.000Z" },
  );
  const fatou = users.find((u) => u.email === "fatou.diop@yahoo.fr")!.id;
  const ibra = users.find((u) => u.email.startsWith("ibrahim"))!.id;
  t.appointments!.push(
    { id: uid(), user_id: fatou, date: "2026-11-17", slot: "10:00", topic: "Prise en main", note: null, status: "confirmé", created_at: "2026-11-10T09:00:00.000Z" },
    { id: uid(), user_id: ibra, date: "2026-11-18", slot: "15:00", topic: "Import d'un relevé", note: null, status: "demandé", created_at: "2026-11-11T09:00:00.000Z" },
    { id: uid(), user_id: D, date: "2026-10-21", slot: "11:00", topic: "Lecture de la performance", note: "Comprendre le TRI", status: "terminé", created_at: "2026-10-15T09:00:00.000Z" },
  );
  t.audit_log!.push(
    { id: uid(), actor_id: D, action: "Import des cours", target: "Séance du 13/11/2026 · 48 titres", created_at: "2026-11-13T18:22:00.000Z" },
    { id: uid(), actor_id: D, action: "Message traité", target: "Partenariat", created_at: "2026-11-02T11:00:00.000Z" },
    { id: uid(), actor_id: D, action: "Compte suspendu", target: "yao.kouassi@gmail.com", created_at: "2026-09-03T08:00:00.000Z" },
  );
  return { version: VERSION, users, session: null, tables: t };
}

// ---------- persistence ----------
let state: State | null = null;
const listeners = new Set<(event: string, session: Session | null) => void>();

function load(): State {
  if (state) return state;
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === VERSION) {
        state = parsed;
        return state;
      }
    }
  } catch {
    /* corrupted: reseed */
  }
  state = seed();
  save();
  return state;
}
function save() {
  if (typeof window === "undefined" || !state) return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

function currentUser(): StoredUser | null {
  const s = load();
  if (!s.session) return null;
  return s.users.find((u) => u.id === s.session!.userId) ?? null;
}
function isAdmin(userId: string | undefined) {
  if (!userId) return false;
  return load().tables.user_roles!.some((r) => r.user_id === userId && r.role === "admin");
}
function publicUser(u: StoredUser): AuthUser {
  const { password: _p, suspended: _s, ...rest } = u;
  return rest;
}
function sessionOf(u: StoredUser | null): Session | null {
  return u ? { user: publicUser(u), access_token: "demo-" + u.id } : null;
}
function emit(event: string) {
  const s = sessionOf(currentUser());
  for (const l of listeners) l(event, s);
}
const err = (message: string) => ({ message, name: "DemoDbError" }) as Error;

// ---------- query builder ----------
type Result = { data: any; error: Error | null; count?: number | null };

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row | Row[] | null = null;
  private filters: ((r: Row) => boolean)[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private from_: number | null = null;
  private to_: number | null = null;
  private limit_: number | null = null;
  private single_: "single" | "maybe" | null = null;
  private returning = false;
  private countMode = false;
  private head = false;
  private onConflict: string[] = [];

  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (this.op !== "select") this.returning = true;
    if (opts?.count) this.countMode = true;
    if (opts?.head) this.head = true;
    return this;
  }
  insert(v: Row | Row[]) { this.op = "insert"; this.payload = v; return this; }
  upsert(v: Row | Row[], opts?: { onConflict?: string }) { this.op = "upsert"; this.payload = v; this.onConflict = opts?.onConflict?.split(",").map((s) => s.trim()) ?? []; return this; }
  update(v: Row) { this.op = "update"; this.payload = v; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: unknown) { this.filters.push((r) => r[c] === v); return this; }
  neq(c: string, v: unknown) { this.filters.push((r) => r[c] !== v); return this; }
  in(c: string, v: unknown[]) { const s = new Set(v); this.filters.push((r) => s.has(r[c])); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] >= v); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] <= v); return this; }
  gt(c: string, v: any) { this.filters.push((r) => r[c] > v); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] < v); return this; }
  is(c: string, v: null) { this.filters.push((r) => (r[c] ?? null) === v); return this; }
  ilike(c: string, pattern: string) {
    const re = new RegExp("^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$", "i");
    this.filters.push((r) => re.test(String(r[c] ?? "")));
    return this;
  }
  order(c: string, opts?: { ascending?: boolean }) { this.orders.push({ col: c, asc: opts?.ascending ?? true }); return this; }
  range(a: number, b: number) { this.from_ = a; this.to_ = b; return this; }
  limit(n: number) { this.limit_ = n; return this; }
  single() { this.single_ = "single"; return this; }
  maybeSingle() { this.single_ = "maybe"; return this; }

  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, ko?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return new Promise<Result>((resolve) => {
      // Small delay so loading states behave like a real network call.
      setTimeout(() => resolve(this.run()), 40);
    }).then(ok, ko);
  }

  private visible(rows: Row[], me: StoredUser | null): Row[] {
    const admin = isAdmin(me?.id);
    if (OWN_ONLY[this.table]) return me ? rows.filter((r) => r[OWN_ONLY[this.table]!] === me.id) : [];
    if (OWN_OR_ADMIN[this.table]) return admin ? rows : me ? rows.filter((r) => r[OWN_OR_ADMIN[this.table]!] === me.id) : [];
    if (ADMIN_ONLY.has(this.table)) return admin ? rows : [];
    return rows;
  }

  private run(): Result {
    const s = load();
    const me = currentUser();
    const all = (s.tables[this.table] ??= []);
    if (this.op === "insert" || this.op === "upsert") {
      if (!me && !PUBLIC_INSERT.has(this.table)) return { data: null, error: err("Connexion requise.") };
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload!]).map((r) => {
        const row: Row = { ...r };
        if (this.table !== "profiles" && !("id" in row) && this.table !== "tour_progress") row.id = uid();
        if (!("created_at" in row) && this.table !== "tour_progress") row.created_at = now();
        if (me && (OWN_ONLY[this.table] || this.table === "appointments") && !row.user_id) row.user_id = me.id;
        return row;
      });
      const out: Row[] = [];
      for (const row of list) {
        if (this.table === "appointments" && all.some((a) => a.date === row.date && a.slot === row.slot && a.status !== "annulé"))
          return { data: null, error: err("Ce créneau vient d'être réservé. Choisis-en un autre.") };
        const keys = this.onConflict.length ? this.onConflict : this.table === "tour_progress" ? ["user_id", "zone"] : ["id"];
        const idx = this.op === "upsert" ? all.findIndex((x) => keys.every((k) => x[k] === row[k])) : -1;
        if (idx >= 0) all[idx] = { ...all[idx], ...row };
        else all.push(row);
        out.push(idx >= 0 ? all[idx]! : row);
      }
      save();
      return this.finish(out);
    }
    const rows = this.visible(all, me).filter((r) => this.filters.every((f) => f(r)));
    if (this.op === "update") {
      for (const r of rows) Object.assign(r, this.payload);
      save();
      return this.finish(rows);
    }
    if (this.op === "delete") {
      const del = new Set(rows);
      s.tables[this.table] = all.filter((r) => !del.has(r));
      if (this.table === "sub_portfolios") for (const t of s.tables.transactions!) if (rows.some((r) => r.id === t.sub_portfolio_id)) t.sub_portfolio_id = null;
      if (this.table === "portfolios") s.tables.transactions = s.tables.transactions!.filter((t) => !rows.some((r) => r.id === t.portfolio_id));
      save();
      return this.finish(rows);
    }
    let out = [...rows];
    if (this.orders.length)
      out.sort((a, b) => {
        for (const o of this.orders) {
          const x = a[o.col], y = b[o.col];
          if (x === y) continue;
          const c = x == null ? -1 : y == null ? 1 : x < y ? -1 : 1;
          return o.asc ? c : -c;
        }
        return 0;
      });
    const count = out.length;
    if (this.from_ != null) out = out.slice(this.from_, (this.to_ ?? out.length) + 1);
    if (this.limit_ != null) out = out.slice(0, this.limit_);
    if (this.head) return { data: null, error: null, count };
    const res = this.finish(out);
    if (this.countMode) res.count = count;
    return res;
  }

  private finish(rows: Row[]): Result {
    if ((this.op === "insert" || this.op === "update" || this.op === "delete" || this.op === "upsert") && !this.returning && !this.single_)
      return { data: null, error: null };
    const copy = rows.map((r) => ({ ...r }));
    if (this.single_) {
      if (copy.length === 0) return this.single_ === "maybe" ? { data: null, error: null } : { data: null, error: err("Aucune ligne trouvée.") };
      return { data: copy[0], error: null };
    }
    return { data: copy, error: null };
  }
}

// ---------- auth ----------
function createUser(email: string, password: string, meta: Record<string, unknown>): StoredUser {
  const s = load();
  const id = uid();
  const u: StoredUser = { id, email, password, created_at: now(), last_sign_in_at: now(), user_metadata: meta };
  s.users.push(u);
  const refCode = typeof meta.ref === "string" ? meta.ref.trim().toUpperCase() : "";
  const referrer = refCode ? s.tables.profiles!.find((p) => p.referral_code === refCode) : undefined;
  s.tables.profiles!.push({ id, email, first_name: (meta.first_name as string) || null, referral_code: code8(), referred_by: referrer?.id ?? null, created_at: now() });
  if (referrer) s.tables.referrals!.push({ id: uid(), referrer_id: referrer.id, referred_id: id, referred_label: email.slice(0, 2) + "•••@" + (email.split("@")[1] ?? ""), created_at: now() });
  s.tables.portfolios!.push({ id: uid(), user_id: id, name: "Mon portefeuille", cash_tracking: true, currency: "XOF", created_at: now() });
  s.tables.user_roles!.push({ id: uid(), user_id: id, role: "user" });
  return u;
}

const auth = {
  async getSession() {
    return { data: { session: sessionOf(currentUser()) }, error: null };
  },
  async getUser() {
    const u = currentUser();
    return { data: { user: u ? publicUser(u) : null }, error: null };
  },
  onAuthStateChange(cb: (event: string, session: Session | null) => void) {
    listeners.add(cb);
    return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } };
  },
  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const s = load();
    const u = s.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (!u || u.password !== password) return { data: { session: null }, error: err("Invalid login credentials") };
    if (u.suspended) return { data: { session: null }, error: err("Account suspended") };
    u.last_sign_in_at = now();
    s.session = { userId: u.id };
    save();
    emit("SIGNED_IN");
    return { data: { session: sessionOf(u) }, error: null };
  },
  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) {
    const s = load();
    if (s.users.some((x) => x.email.toLowerCase() === email.toLowerCase())) return { data: { session: null, user: null }, error: err("User already registered") };
    const u = createUser(email, password, options?.data ?? {});
    s.session = { userId: u.id };
    save();
    emit("SIGNED_IN");
    return { data: { session: sessionOf(u), user: publicUser(u) }, error: null };
  },
  async signOut() {
    const s = load();
    s.session = null;
    save();
    emit("SIGNED_OUT");
    return { error: null };
  },
  async resetPasswordForEmail(_email: string, _opts?: unknown) {
    return { data: {}, error: null };
  },
  async updateUser(attrs: { password?: string; email?: string; data?: Record<string, unknown> }) {
    const u = currentUser();
    if (!u) return { data: { user: null }, error: err("Session expirée.") };
    const s = load();
    if (attrs.email && s.users.some((x) => x.id !== u.id && x.email.toLowerCase() === attrs.email!.toLowerCase()))
      return { data: { user: null }, error: err("Cette adresse est déjà utilisée.") };
    if (attrs.password) u.password = attrs.password;
    if (attrs.email) {
      u.email = attrs.email;
      const p = s.tables.profiles!.find((x) => x.id === u.id);
      if (p) p.email = attrs.email;
    }
    if (attrs.data) u.user_metadata = { ...u.user_metadata, ...attrs.data };
    save();
    emit("USER_UPDATED");
    return { data: { user: publicUser(u) }, error: null };
  },
};

// ---------- rpc ----------
async function rpc(name: string, args: Record<string, any> = {}): Promise<Result> {
  await new Promise((r) => setTimeout(r, 40));
  const s = load();
  const me = currentUser();
  switch (name) {
    case "has_role":
      return { data: s.tables.user_roles!.some((r) => r.user_id === args._user_id && r.role === args._role), error: null };
    case "taken_slots":
      return { data: s.tables.appointments!.filter((a) => a.date >= args.p_from && a.date <= args.p_to && a.status !== "annulé").map((a) => ({ date: a.date, slot: a.slot })), error: null };
    case "admin_users": {
      if (!isAdmin(me?.id)) return { data: null, error: err("Accès réservé aux administrateurs.") };
      return {
        data: s.users.map((u) => {
          const p = s.tables.profiles!.find((x) => x.id === u.id);
          const txs = s.tables.transactions!.filter((t) => t.user_id === u.id);
          return {
            id: u.id, email: u.email, first_name: p?.first_name ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
            suspended: !!u.suspended, is_admin: isAdmin(u.id),
            portfolios: s.tables.portfolios!.filter((x) => x.user_id === u.id).length,
            transactions: txs.length,
            last_tx: txs.reduce<string | null>((m, t) => (!m || t.created_at > m ? t.created_at : m), null),
            referrals: s.tables.referrals!.filter((r) => r.referrer_id === u.id).length,
          };
        }),
        error: null,
      };
    }
    case "admin_set_role":
    case "admin_set_suspended": {
      if (!isAdmin(me?.id)) return { data: null, error: err("Accès réservé aux administrateurs.") };
      const target = s.users.find((u) => u.id === args.user_id);
      if (!target) return { data: null, error: err("Utilisateur introuvable.") };
      if (target.id === me!.id) return { data: null, error: err("Tu ne peux pas modifier ton propre compte ici.") };
      if (name === "admin_set_role") {
        s.tables.user_roles = s.tables.user_roles!.filter((r) => r.user_id !== target.id);
        s.tables.user_roles.push({ id: uid(), user_id: target.id, role: args.admin ? "admin" : "user" });
      } else target.suspended = !!args.suspended;
      s.tables.audit_log!.push({
        id: uid(), actor_id: me!.id, created_at: now(), target: target.email,
        action: name === "admin_set_role" ? (args.admin ? "Rôle admin accordé" : "Rôle admin retiré") : args.suspended ? "Compte suspendu" : "Compte réactivé",
      });
      save();
      return { data: true, error: null };
    }
    case "delete_account": {
      if (!me) return { data: null, error: err("Session expirée.") };
      s.users = s.users.filter((u) => u.id !== me.id);
      for (const [table, col] of Object.entries({ ...OWN_ONLY, profiles: "id", user_roles: "user_id", appointments: "user_id" }))
        s.tables[table] = (s.tables[table] ?? []).filter((r) => r[col] !== me.id);
      s.session = null;
      save();
      emit("SIGNED_OUT");
      return { data: true, error: null };
    }
    default:
      return { data: null, error: err(`Fonction inconnue : ${name}`) };
  }
}

export const db = {
  from: (table: string) => new Query(table),
  auth,
  rpc,
};

/** Wipes the browser copy and restores the demo accounts. */
export function resetDemoData() {
  state = seed();
  save();
  emit("SIGNED_OUT");
}
