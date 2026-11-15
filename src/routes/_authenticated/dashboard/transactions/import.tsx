import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, ClipboardPaste, Copy, Download, FileSpreadsheet, FileUp, RotateCcw, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { KeyValue, Money, Section, StatCard } from "@/components/app/kpi";
import { ErrorState, LoadingGrid } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/local-db";
import { txQueryKey, useAnalytics, useSubPortfolios } from "@/lib/portfolio";
import { checkRow, importSummary, parseNumber, parseRows, splitPasted, type ParsedRow } from "@/lib/import";
import { readSheet, exportCsv } from "@/lib/export";
import { TX_LABEL, TX_TYPES } from "@/lib/constants";
import type { TxType } from "@/lib/engine";
import { fmtDate, fmtNum } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/transactions/import")({
  head: () => ({
    meta: [
      { title: "Importer un relevé — Kauri" },
      { name: "description", content: "Importe le relevé de ta SGI (Excel, CSV ou texte d'un PDF), vérifie les opérations détectées puis valide." },
    ],
  }),
  component: ImportPage,
});

interface ReviewRow extends ParsedRow {
  key: string;
  include: boolean;
  duplicate: boolean;
}

const TEMPLATE_HEAD = ["Date", "Type", "Titre", "Quantité", "Prix", "Frais", "Montant", "IRVM", "Note"];
const TEMPLATE_ROWS = [
  ["10/07/2026", "Versement", "", "", "", "", "1 000 000", "", "Dépôt initial"],
  ["10/07/2026", "Achat", "SNTS", "10", "25 000", "3 000", "", "", ""],
  ["14/08/2026", "Dividende", "SNTS", "10", "1 655", "", "16 550", "1 655", ""],
  ["02/09/2026", "Vente", "SNTS", "5", "26 500", "1 590", "", "", ""],
  ["30/09/2026", "Frais", "", "", "", "", "6 000", "", "Droits de garde"],
];

const STEPS = ["Fichier", "Vérification", "Terminé"] as const;

function ImportPage() {
  const a = useAnalytics();
  const subs = useSubPortfolios();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [filename, setFilename] = useState("");
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [missing, setMissing] = useState<string[]>([]);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);
  const [sub, setSub] = useState("none");
  const [filter, setFilter] = useState<"all" | "errors" | "duplicates">("all");
  const [imported, setImported] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const history = useQuery({
    queryKey: ["imports"],
    queryFn: async () => {
      const { data, error } = await db.from("imports").select("*").order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return (data ?? []) as { id: string; filename: string; status: string; rows_read: number; rows_imported: number; created_at: string }[];
    },
  });

  const tickers = useMemo(() => new Set([...a.securities.values()].map((s) => s.ticker)), [a.securities]);
  const byTicker = useMemo(() => new Map([...a.securities.values()].map((s) => [s.ticker, s])), [a.securities]);
  const existing = useMemo(
    () => new Set(a.rawTxs.map((t) => [t.date, t.type, t.security_id ?? "", t.quantity, Math.round(t.amount || t.quantity * t.price)].join("|"))),
    [a.rawTxs],
  );

  function fingerprint(r: ParsedRow) {
    const sec = r.ticker ? byTicker.get(r.ticker)?.securityId ?? "" : "";
    return [r.date, r.type, sec, r.type === "acquisition" || r.type === "cession" ? r.quantity : r.type === "dividende" ? r.quantity : 0, Math.round(r.amount || r.quantity * r.price)].join("|");
  }

  function load(table: string[][], name: string) {
    const res = parseRows(table, tickers);
    setMissing(res.missing);
    if (res.missing.length) {
      toast.error(`Colonnes introuvables : ${res.missing.join(", ")}. Vérifie l'en-tête du fichier.`);
      return;
    }
    if (res.rows.length === 0) {
      toast.error("Aucune opération détectée dans ce fichier.");
      return;
    }
    const seen = new Set<string>();
    setRows(
      res.rows.map((r, i) => {
        const fp = fingerprint(r);
        const duplicate = existing.has(fp) || seen.has(fp);
        seen.add(fp);
        return { ...r, key: `${i}-${r.line}`, include: r.errors.length === 0 && !duplicate, duplicate };
      }),
    );
    setFilename(name);
    setFilter("all");
    setStep(1);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop lourd (5 Mo maximum).");
      return;
    }
    if (/\.pdf$/i.test(file.name)) {
      toast.info("Pour un relevé PDF : ouvre-le, sélectionne le tableau des opérations, copie-le et colle-le dans la zone « Coller le texte ».");
      return;
    }
    if (!/\.(csv|xlsx|xls|ods|txt)$/i.test(file.name)) {
      toast.error("Format non pris en charge. Utilise un fichier CSV ou Excel.");
      return;
    }
    setBusy(true);
    try {
      const table = await readSheet(file);
      load(table, file.name);
    } catch {
      toast.error("Ce fichier n'a pas pu être lu. Réessaie avec un export CSV ou Excel de ta SGI.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function onPaste() {
    const table = splitPasted(pasted);
    if (table.length < 2) {
      toast.error("Colle au moins une ligne d'en-tête et une opération.");
      return;
    }
    load(table, "Texte collé");
  }

  function update(key: string, patch: Partial<ReviewRow>) {
    setRows((list) =>
      list.map((r) => {
        if (r.key !== key) return r;
        const next = { ...r, ...patch };
        next.errors = checkRow(next, tickers);
        if (next.errors.length > 0) next.include = false;
        else if (patch.include === undefined && r.errors.length > 0) next.include = true;
        return next;
      }),
    );
  }

  const selected = rows.filter((r) => r.include && r.errors.length === 0);
  const summary = importSummary(selected);
  const errorCount = rows.filter((r) => r.errors.length > 0).length;
  const dupCount = rows.filter((r) => r.duplicate).length;
  const shown = rows.filter((r) => (filter === "errors" ? r.errors.length > 0 : filter === "duplicates" ? r.duplicate : true));

  async function validate() {
    if (!a.portfolio || selected.length === 0) return;
    setBusy(true);
    const payload = selected.map((r) => {
      const sec = r.ticker ? byTicker.get(r.ticker) : undefined;
      const isTrade = r.type === "acquisition" || r.type === "cession";
      return {
        portfolio_id: a.portfolio!.id,
        sub_portfolio_id: sub === "none" ? null : sub,
        type: r.type,
        date: r.date,
        security_id: isTrade || r.type === "dividende" ? (sec?.securityId ?? null) : null,
        quantity: isTrade || r.type === "dividende" ? r.quantity : 0,
        price: isTrade || r.type === "dividende" ? r.price : 0,
        fees: isTrade ? r.fees : 0,
        amount: isTrade ? 0 : r.amount,
        tax: r.type === "dividende" ? r.tax : 0,
        note: r.note,
        source: "import",
      };
    });
    const { error } = await db.from("transactions").insert(payload);
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await db.from("imports").insert({
      filename: filename.slice(0, 120),
      status: "validé",
      rows_read: rows.length,
      rows_imported: selected.length,
      errors: rows.filter((r) => r.errors.length).map((r) => ({ line: r.line, errors: r.errors })),
    });
    setBusy(false);
    setImported(selected.length);
    setStep(2);
    qc.invalidateQueries({ queryKey: txQueryKey(a.portfolio.id) });
    qc.invalidateQueries({ queryKey: ["imports"] });
    toast.success(`${selected.length} opération${selected.length > 1 ? "s" : ""} importée${selected.length > 1 ? "s" : ""}.`);
  }

  function reset() {
    setRows([]);
    setFilename("");
    setPasted("");
    setMissing([]);
    setStep(0);
  }

  if (a.error) return <ErrorState error={a.error} />;
  if (a.loading || !a.portfolio) return <LoadingGrid />;

  return (
    <>
      <PageHeader
        eyebrow="Transactions"
        title="Importer un relevé"
        description="Kauri lit le relevé de ta SGI, sépare trésorerie et actions, puis te laisse tout vérifier avant d'enregistrer."
        actions={
          <Button asChild variant="ghost">
            <Link to="/dashboard/transactions">
              <ArrowLeft /> Retour aux transactions
            </Link>
          </Button>
        }
      />

      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="Étapes de l'import">
        {STEPS.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-bold",
                i < step && "border-transparent bg-gain text-primary-foreground",
                i === step && "border-transparent bg-ink text-ink-foreground",
                i > step && "text-muted-foreground",
              )}
            >
              {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn(i === step ? "font-semibold" : "text-muted-foreground")}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-8 bg-border" aria-hidden="true" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <Section title="1. Dépose ton relevé" description="Excel (.xlsx, .xls) ou CSV, 5 Mo maximum. Le fichier est lu dans ton navigateur et n'est pas conservé.">
              <label
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  onFile(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors",
                  dragOver ? "border-primary bg-gold-soft" : "hover:border-primary/60 hover:bg-secondary/60",
                )}
              >
                <FileUp className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-semibold">{busy ? "Lecture du fichier…" : "Glisse ton fichier ici ou clique pour le choisir"}</p>
                  <p className="text-sm text-muted-foreground">CSV, Excel · Relevé PDF : utilise « Coller le texte » ci-dessous</p>
                </div>
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.ods,.txt,.pdf" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
              </label>
              {missing.length > 0 && (
                <p className="mt-3 flex items-center gap-2 text-sm text-loss">
                  <AlertTriangle className="h-4 w-4" /> Colonnes manquantes : {missing.join(", ")}
                </p>
              )}
            </Section>

            <Section title="Ou colle le texte du relevé" description="Depuis un PDF ou un tableur : copie le tableau des opérations, en-tête compris.">
              <Textarea
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
                rows={6}
                className="font-mono text-xs"
                placeholder={"Date;Type;Titre;Quantité;Prix;Frais;Montant\n10/07/2026;Achat;SNTS;10;25 000;3 000;"}
                aria-label="Texte du relevé"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={onPaste} disabled={!pasted.trim()}>
                  <ClipboardPaste /> Analyser le texte
                </Button>
              </div>
            </Section>
          </div>

          <div className="space-y-4">
            <Section title="Colonnes reconnues">
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li><span className="font-semibold text-foreground">Date</span> · jj/mm/aaaa ou aaaa-mm-jj</li>
                <li><span className="font-semibold text-foreground">Type</span> · Achat, Vente, Versement, Retrait, Dividende, Frais</li>
                <li><span className="font-semibold text-foreground">Titre</span> · code BRVM (SNTS, ORAC…)</li>
                <li><span className="font-semibold text-foreground">Quantité, Prix, Frais</span> · pour les achats et ventes</li>
                <li><span className="font-semibold text-foreground">Montant, IRVM</span> · dépôts, retraits, dividendes, frais</li>
              </ul>
              <Button variant="outline" className="mt-4 w-full" onClick={() => exportCsv("kauri-modele-import.csv", TEMPLATE_HEAD, TEMPLATE_ROWS)}>
                <Download /> Télécharger le modèle CSV
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={() => load([TEMPLATE_HEAD, ...TEMPLATE_ROWS], "Exemple Kauri")}>
                <FileSpreadsheet /> Essayer avec l'exemple
              </Button>
            </Section>
            <Section title="Derniers imports">
              {history.data && history.data.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {history.data.map((h) => (
                    <li key={h.id} className="flex items-start justify-between gap-2 border-b border-dashed pb-2 last:border-0">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{h.filename}</span>
                        <span className="text-xs text-muted-foreground">{fmtDate(h.created_at)}</span>
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground tabular">
                        {h.rows_imported}/{h.rows_read} lignes
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Aucun import pour l'instant.</p>
              )}
            </Section>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Opérations détectées" value={fmtNum(rows.length)} sub={filename} />
            <StatCard label="Prêtes à importer" value={fmtNum(selected.length)} sub={`${errorCount} à corriger · ${dupCount} doublon${dupCount > 1 ? "s" : ""}`} />
            <StatCard label="Trésorerie" value={<Money value={summary.deposits - summary.withdrawals} signed />} sub="Dépôts moins retraits" />
            <StatCard label="Actions" value={<Money value={summary.buys - summary.sells} />} sub="Achats moins ventes" emphasis />
          </div>

          <Section
            title="2. Vérifie les opérations détectées"
            description="Corrige les lignes en rouge, décoche celles à ignorer. Rien n'est enregistré avant ta validation."
            actions={
              <div className="inline-flex rounded-lg border bg-secondary p-0.5" role="tablist" aria-label="Filtrer les lignes">
                {([
                  ["all", `Toutes (${rows.length})`],
                  ["errors", `À corriger (${errorCount})`],
                  ["duplicates", `Doublons (${dupCount})`],
                ] as const).map(([k, l]) => (
                  <button
                    key={k}
                    role="tab"
                    aria-selected={filter === k}
                    onClick={() => setFilter(k)}
                    className={cn("rounded-md px-2.5 py-1 text-xs font-semibold", filter === k ? "bg-card shadow-sm" : "text-muted-foreground")}
                  >
                    {l}
                  </button>
                ))}
              </div>
            }
          >
            <div className="-mx-4 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[980px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="w-10 px-2 py-2">
                      <Checkbox
                        aria-label="Tout sélectionner"
                        checked={rows.length > 0 && rows.every((r) => r.include || r.errors.length > 0)}
                        onCheckedChange={(v) => setRows((l) => l.map((r) => ({ ...r, include: !!v && r.errors.length === 0 })))}
                      />
                    </th>
                    <th className="px-2 py-2">Ligne</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Titre</th>
                    <th className="px-2 py-2 text-right">Qté</th>
                    <th className="px-2 py-2 text-right">Prix</th>
                    <th className="px-2 py-2 text-right">Frais</th>
                    <th className="px-2 py-2 text-right">Montant</th>
                    <th className="px-2 py-2 text-right">IRVM</th>
                    <th className="px-2 py-2">Contrôle</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const isTrade = r.type === "acquisition" || r.type === "cession";
                    const numCell = (field: "quantity" | "price" | "fees" | "amount" | "tax", enabled: boolean) => (
                      <td className="px-1 py-1.5">
                        <Input
                          aria-label={`${field} ligne ${r.line}`}
                          className="h-8 w-24 text-right tabular"
                          disabled={!enabled}
                          defaultValue={r[field] ? fmtNum(r[field]) : ""}
                          onBlur={(e) => update(r.key, { [field]: Math.abs(parseNumber(e.target.value) ?? 0) } as Partial<ReviewRow>)}
                        />
                      </td>
                    );
                    return (
                      <tr key={r.key} className={cn("border-b last:border-0", r.errors.length > 0 && "bg-loss-soft/60", r.duplicate && r.errors.length === 0 && "bg-gold-soft/60")}>
                        <td className="px-2 py-1.5">
                          <Checkbox aria-label={`Importer la ligne ${r.line}`} checked={r.include} disabled={r.errors.length > 0} onCheckedChange={(v) => update(r.key, { include: !!v })} />
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground tabular">{r.line}</td>
                        <td className="px-1 py-1.5">
                          <Input type="date" aria-label={`Date ligne ${r.line}`} className="h-8 w-36" value={r.date ?? ""} onChange={(e) => update(r.key, { date: e.target.value || null })} />
                        </td>
                        <td className="px-1 py-1.5">
                          <Select value={r.type ?? ""} onValueChange={(v) => update(r.key, { type: v as TxType })}>
                            <SelectTrigger className="h-8 w-32" aria-label={`Type ligne ${r.line}`}>
                              <SelectValue placeholder="Type ?" />
                            </SelectTrigger>
                            <SelectContent>
                              {TX_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="px-1 py-1.5">
                          <Input
                            aria-label={`Titre ligne ${r.line}`}
                            className="h-8 w-24 uppercase"
                            disabled={!(isTrade || r.type === "dividende")}
                            defaultValue={r.ticker ?? ""}
                            onBlur={(e) => update(r.key, { ticker: e.target.value.trim().toUpperCase() || null })}
                          />
                        </td>
                        {numCell("quantity", isTrade || r.type === "dividende")}
                        {numCell("price", isTrade || r.type === "dividende")}
                        {numCell("fees", isTrade)}
                        {numCell("amount", !isTrade)}
                        {numCell("tax", r.type === "dividende")}
                        <td className="px-2 py-1.5 text-xs">
                          {r.errors.length > 0 ? (
                            <span className="text-loss">{r.errors.join(" · ")}</span>
                          ) : r.duplicate ? (
                            <Badge variant="outline" className="border-primary/60">Doublon possible</Badge>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-gain"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span>
                          )}
                        </td>
                        <td className="px-1 py-1.5">
                          <Button variant="ghost" size="icon" aria-label={`Retirer la ligne ${r.line}`} onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                  {shown.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-8 text-center text-muted-foreground">Aucune ligne dans ce filtre.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>

          <div className="grid gap-4 lg:grid-cols-3">
            <Section title="Séparation trésorerie / actions" className="lg:col-span-2">
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div>
                  <KeyValue label="Dépôts" value={<Money value={summary.deposits} />} />
                  <KeyValue label="Retraits" value={<Money value={-summary.withdrawals} />} />
                  <KeyValue label="Dividendes nets" value={<Money value={summary.dividends} />} />
                </div>
                <div>
                  <KeyValue label="Achats de titres" value={<Money value={summary.buys} />} />
                  <KeyValue label="Ventes de titres" value={<Money value={summary.sells} />} />
                  <KeyValue label="Frais" value={<Money value={summary.fees} />} />
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Effet sur la liquidité : <Money value={summary.netCash} signed tone className="font-semibold" />
              </p>
            </Section>
            <Section title="3. Valider">
              <Label htmlFor="sub">Sous-portefeuille (facultatif)</Label>
              <Select value={sub} onValueChange={setSub}>
                <SelectTrigger id="sub" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Portefeuille principal</SelectItem>
                  {(subs.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button className="mt-4 w-full" size="lg" onClick={validate} disabled={busy || selected.length === 0}>
                <Upload /> {busy ? "Import…" : `Importer ${selected.length} opération${selected.length > 1 ? "s" : ""}`}
              </Button>
              <Button variant="ghost" className="mt-2 w-full" onClick={reset}>
                <RotateCcw /> Changer de fichier
              </Button>
            </Section>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
          <CheckCircle2 className="mx-auto h-10 w-10 text-gain" />
          <h2 className="mt-3 text-2xl font-bold">{imported} opération{imported > 1 ? "s" : ""} ajoutée{imported > 1 ? "s" : ""}</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Ta performance est recalculée. Tu peux modifier ou supprimer chaque opération depuis l'historique.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard">Voir ma performance</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/dashboard/transactions">Voir l'historique</Link>
            </Button>
            <Button variant="ghost" onClick={reset}>
              <Copy /> Importer un autre relevé
            </Button>
          </div>
        </div>
      )}
      <p className="mt-6 text-xs text-muted-foreground">
        Types reconnus : {Object.values(TX_LABEL).join(", ")}. Tous les montants sont en FCFA.
      </p>
    </>
  );
}
