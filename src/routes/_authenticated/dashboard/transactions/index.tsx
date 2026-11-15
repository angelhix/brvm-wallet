import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, FileText, Plus, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { KeyValue, Money, Section, StatCard } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { EmptyPortfolio, ErrorState, LoadingGrid } from "@/components/app/states";
import { Tour } from "@/components/app/tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { txQueryKey, useAnalytics, type TxRow } from "@/lib/portfolio";
import { feeRatio, flowDirection, grossAmount } from "@/lib/engine";
import { TX_LABEL } from "@/lib/constants";
import { fmtDate, fmtFCFA, fmtNum, fmtPct } from "@/lib/format";
import { exportCsv, exportPdf, exportXlsx, type Cell } from "@/lib/export";
import { toEngineTx } from "@/lib/portfolio";

export const Route = createFileRoute("/_authenticated/dashboard/transactions/")({
  head: () => ({ meta: [{ title: "Transactions — Kauri" }, { name: "description", content: "Historique, synthèse et export de tes opérations BRVM." }] }),
  component: Transactions,
});

const STEPS = [
  { target: '[data-tour="tx-actions"]', title: "Saisir ou importer", body: "Ajoute une opération à la main ou importe le relevé de ta SGI (CSV ou Excel)." },
  { target: '[data-tour="tx-export"]', title: "Exporter", body: "Télécharge ton historique en CSV, Excel ou PDF, prêt pour ta déclaration IRVM." },
];

function Transactions() {
  const a = useAnalytics();
  const qc = useQueryClient();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const sec = (id: string | null) => (id ? a.securities.get(id) : undefined);

  const rows = useMemo(() => a.rawTxs.filter((t) => (!from || t.date >= from) && (!to || t.date <= to)), [a.rawTxs, from, to]);
  const stats = useMemo(() => {
    const s = { volume: 0, acq: 0, acqN: 0, ces: 0, cesN: 0, div: 0, divN: 0, fees: 0, feesN: 0 };
    for (const t of rows) {
      const g = grossAmount(toEngineTx(t));
      if (t.type === "acquisition") { s.acq += g; s.acqN++; s.volume += g; }
      if (t.type === "cession") { s.ces += g; s.cesN++; s.volume += g; }
      if (t.type === "dividende") { s.div += t.amount - t.tax; s.divN++; }
      if (t.fees > 0 || t.type === "frais") { s.fees += t.type === "frais" ? t.amount : t.fees; s.feesN++; }
    }
    return s;
  }, [rows]);
  const bySec = useMemo(() => {
    const m = new Map<string, { bought: number; sold: number; div: number; fees: number; n: number }>();
    let cashIn = 0;
    let cashOut = 0;
    for (const t of rows) {
      if (t.type === "depot") cashIn += t.amount;
      if (t.type === "retrait") cashOut += t.amount;
      if (!t.security_id) continue;
      const r = m.get(t.security_id) ?? { bought: 0, sold: 0, div: 0, fees: 0, n: 0 };
      if (t.type === "acquisition") r.bought += t.quantity * t.price;
      if (t.type === "cession") r.sold += t.quantity * t.price;
      if (t.type === "dividende") r.div += t.amount - t.tax;
      r.fees += t.fees;
      r.n++;
      m.set(t.security_id, r);
    }
    return { list: [...m.entries()].sort((x, y) => y[1].bought - x[1].bought), cashIn, cashOut };
  }, [rows]);

  async function remove(t: TxRow) {
    if (!confirm("Supprimer cette opération ?")) return;
    const { error } = await supabase.from("transactions").delete().eq("id", t.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Opération supprimée.");
    qc.invalidateQueries({ queryKey: txQueryKey(a.portfolio?.id) });
  }

  if (a.error) return <ErrorState error={a.error} />;
  if (a.loading || !a.portfolio) return <LoadingGrid />;

  const describe = (t: TxRow) => {
    if (t.type === "acquisition" || t.type === "cession") return `${fmtNum(t.quantity)} × ${fmtNum(t.price)}`;
    return fmtFCFA(t.amount);
  };
  const HEAD = ["Date", "Type", "Titre", "Quantité", "Prix unitaire", "Frais", "Montant", "IRVM", "Sens", "Note"];
  const table = (): Cell[][] =>
    rows.map((t) => [t.date, TX_LABEL[t.type] ?? t.type, sec(t.security_id)?.ticker ?? "", t.quantity || "", t.price || "", t.fees || "", grossAmount(toEngineTx(t)), t.tax || "", flowDirection(toEngineTx(t)), t.note ?? ""]);
  const fname = `kauri-transactions-${new Date().toISOString().slice(0, 10)}`;
  const lastEntry = a.rawTxs.reduce<string | null>((m, t) => (!m || t.created_at > m ? t.created_at : m), null);

  const actions = (
    <div className="flex flex-wrap gap-2" data-tour="tx-actions">
      <Button asChild><Link to="/dashboard/transactions/nouvelle"><Plus /> Nouvelle</Link></Button>
      <Button asChild variant="outline"><Link to="/dashboard/transactions/import"><Upload /> Importer</Link></Button>
    </div>
  );

  if (a.rawTxs.length === 0)
    return (<><PageHeader eyebrow="Portefeuille" title="Transactions" actions={actions} /><EmptyPortfolio /></>);

  return (
    <>
      <PageHeader eyebrow="Portefeuille" title="Transactions" description={`Dernière saisie le ${fmtDate(lastEntry)}`} actions={actions} />
      <Tour zone="transactions" steps={STEPS} />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div><Label htmlFor="from">Du</Label><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-44" /></div>
        <div><Label htmlFor="to">Au</Label><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-44" /></div>
        {(from || to) && <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); }}>Effacer</Button>}
        <div className="ml-auto flex flex-wrap gap-2" data-tour="tx-export">
          <Button variant="outline" size="sm" onClick={() => exportCsv(`${fname}.csv`, HEAD, table())}><FileText /> CSV</Button>
          <Button variant="outline" size="sm" onClick={() => exportXlsx(`${fname}.xlsx`, "Transactions", HEAD, table())}><FileSpreadsheet /> Excel</Button>
          <Button variant="outline" size="sm" onClick={() => exportPdf(`${fname}.pdf`, "Historique des transactions", `${a.portfolio!.name} · ${rows.length} opérations · édité le ${fmtDate(new Date().toISOString())}`, HEAD.slice(0, 9), table().map((r) => r.slice(0, 9)))}><FileDown /> PDF</Button>
        </div>
      </div>
      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Volume mouvementé" value={fmtFCFA(stats.volume)} sub={`${stats.acqN + stats.cesN} opérations`} />
        <StatCard label="Acquisitions" value={fmtFCFA(stats.acq)} sub={`${stats.acqN} opérations`} />
        <StatCard label="Cessions" value={fmtFCFA(stats.ces)} sub={`${stats.cesN} opérations`} />
        <StatCard label="Dividendes nets" value={fmtFCFA(stats.div)} sub={`${stats.divN} versements`} />
        <StatCard label="Frais cumulés" value={fmtFCFA(stats.fees)} sub={`${stats.feesN} opérations`} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Section title="Historique" description={`${rows.length} opération${rows.length > 1 ? "s" : ""}`}>
          <DataTable
            rows={rows}
            rowKey={(t) => t.id}
            empty="Aucune opération sur cette période."
            columns={[
              { key: "d", header: "Date", cell: (t) => fmtDate(t.date) },
              { key: "ty", header: "Type", cell: (t) => <span className="font-medium">{TX_LABEL[t.type]}</span> },
              { key: "s", header: "Titre", cell: (t) => sec(t.security_id)?.ticker ?? "—" },
              { key: "q", header: "Détail", align: "right", cell: describe },
              { key: "f", header: "Frais", align: "right", cell: (t) => (t.fees ? <>+{fmtNum(t.fees)}<span className="block text-xs text-muted-foreground">{fmtPct(feeRatio(t))}</span></> : "—") },
              { key: "dir", header: "Flux", cell: (t) => { const d = flowDirection(toEngineTx(t)); return <span className={d === "Entrée" ? "text-gain" : "text-loss"}>{d}</span>; } },
              { key: "x", header: "", align: "right", cell: (t) => <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Supprimer" onClick={() => remove(t)}><Trash2 className="h-3.5 w-3.5" /></Button> },
            ]}
          />
        </Section>
        <Section title="Récapitulatif par titre">
          {bySec.list.map(([id, r]) => (
            <KeyValue key={id} label={sec(id)?.ticker ?? "?"} hint={`${r.n} opérations · frais ${fmtNum(r.fees)}`} value={<>{fmtFCFA(r.bought)}{r.sold > 0 && <span className="block text-xs text-muted-foreground">cédé {fmtFCFA(r.sold)}</span>}{r.div > 0 && <span className="block text-xs text-gain">div. {fmtFCFA(r.div)}</span>}</>} />
          ))}
          <KeyValue label="Trésorerie" hint="dépôts − retraits" value={<Money value={bySec.cashIn - bySec.cashOut} />} />
        </Section>
      </div>
    </>
  );
}
