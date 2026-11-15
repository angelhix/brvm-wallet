import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileDown, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { KeyValue, Money, Pct, Section, StatCard, Tone } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { ErrorState, LoadingGrid } from "@/components/app/states";
import { Tour } from "@/components/app/tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { txQueryKey, useAnalytics, usePortfolio, useSubPortfolios } from "@/lib/portfolio";
import { TX_LABEL } from "@/lib/constants";
import { fmtDate, fmtFCFA, fmtNum, fmtPct } from "@/lib/format";
import { exportPdf } from "@/lib/export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/sous-portefeuilles")({
  head: () => ({ meta: [{ title: "Sous-portefeuilles — Kauri" }, { name: "description", content: "Regroupe tes titres par objectif : retraite, études, spéculatif." }] }),
  component: SousPortefeuilles,
});

const STEPS = [
  { target: '[data-tour="subs"]', title: "Tes objectifs", body: "Crée un sous-portefeuille par objectif, puis range tes opérations dedans." },
  { target: '[data-tour="assign"]', title: "Ranger une opération", body: "Choisis le sous-portefeuille de chaque opération : la performance se calcule à part." },
];

function SousPortefeuilles() {
  const { portfolio } = usePortfolio();
  const subsQ = useSubPortfolios();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const subs = subsQ.data ?? [];
  const current = subs.find((s) => s.id === selected) ?? subs[0] ?? null;
  const all = useAnalytics();
  const a = useAnalytics({ subPortfolioId: current?.id ?? "__none__" });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sub-portfolios", portfolio?.id] });
    qc.invalidateQueries({ queryKey: txQueryKey(portfolio?.id) });
  };

  async function create() {
    const n = name.trim();
    if (!n || !portfolio) return;
    const { data, error } = await supabase.from("sub_portfolios").insert({ name: n.slice(0, 60), portfolio_id: portfolio.id }).select().single();
    if (error) { toast.error(error.message); return; }
    setName("");
    setSelected(data.id);
    refresh();
  }
  async function rename(id: string, n: string) {
    const { error } = await supabase.from("sub_portfolios").update({ name: n.trim().slice(0, 60) }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditing(null);
    refresh();
  }
  async function remove(id: string) {
    if (!confirm("Supprimer ce sous-portefeuille ? Ses opérations restent dans le portefeuille principal.")) return;
    const { error } = await supabase.from("sub_portfolios").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setSelected(null);
    refresh();
  }
  async function assign(txId: string, subId: string) {
    const { error } = await supabase.from("transactions").update({ sub_portfolio_id: subId === "none" ? null : subId }).eq("id", txId);
    if (error) { toast.error(error.message); return; }
    refresh();
  }

  if (subsQ.error || all.error) return <ErrorState error={subsQ.error || all.error} />;
  if (subsQ.isLoading || all.loading || !portfolio) return <LoadingGrid />;

  const v = a.valuation;
  const sec = (id: string | null) => (id ? all.securities.get(id) : undefined);

  async function pdf() {
    if (!current || !v) return;
    await exportPdf(
      `kauri-${current.name.toLowerCase().replace(/\W+/g, "-")}.pdf`,
      `Sous-portefeuille ${current.name}`,
      `${portfolio!.name} · clôture du ${fmtDate(a.asOf)} · valeur ${fmtFCFA(v.totalValue)} · gain ${fmtFCFA(v.gain, { signed: true })} · dividendes ${fmtFCFA(v.dividendsNet)}`,
      ["Titre", "Quantité", "PRU", "Cours", "Valeur", "Plus-value", "Poids"],
      v.positions.map((p) => [sec(p.securityId)?.ticker ?? "", fmtNum(p.quantity), fmtNum(p.unitCost), fmtNum(p.lastPrice), fmtNum(p.value), fmtFCFA(p.unrealized, { signed: true }), fmtPct(p.weight, { decimals: 1 })]),
    );
  }

  return (
    <>
      <PageHeader eyebrow="Portefeuille" title="Sous-portefeuilles" description="Regroupe tes opérations par objectif et suis la performance de chacun." />
      <Tour zone="sous-portefeuilles" steps={STEPS} ready={!subsQ.isLoading} />
      <div className="grid gap-4 lg:grid-cols-[18rem_1fr]">
        <Section title="Objectifs" data-tour="subs">
          <ul className="space-y-1">
            {subs.map((s) => (
              <li key={s.id} className={cn("flex items-center gap-1 rounded-lg px-2 py-1.5", current?.id === s.id && "bg-secondary")}>
                {editing === s.id ? (
                  <form className="flex flex-1 gap-1" onSubmit={(e) => { e.preventDefault(); rename(s.id, new FormData(e.currentTarget).get("n") as string); }}>
                    <Input name="n" defaultValue={s.name} autoFocus className="h-8" maxLength={60} />
                    <Button size="sm" type="submit">OK</Button>
                  </form>
                ) : (
                  <>
                    <button className="flex-1 text-left text-sm font-medium" onClick={() => setSelected(s.id)}>{s.name}</button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Renommer ${s.name}`} onClick={() => setEditing(s.id)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Supprimer ${s.name}`} onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); create(); }}>
            <Input placeholder="Retraite, Études…" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <Button type="submit" size="icon" aria-label="Créer"><Plus /></Button>
          </form>
        </Section>

        <div className="space-y-4">
          {!current ? (
            <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Crée ton premier sous-portefeuille, par exemple « Retraite » ou « Spéculatif ».</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard emphasis label={current.name} value={fmtFCFA(v?.totalValue ?? 0)} sub={`${v?.positions.length ?? 0} titres`} />
                <StatCard label="Gain total" value={<Tone value={v?.gain}>{fmtFCFA(v?.gain ?? 0, { signed: true })}</Tone>} sub={<Pct value={a.annualized} />} />
                <StatCard label="Dividendes nets" value={fmtFCFA(v?.dividendsNet ?? 0)} sub={`Liquidité ${fmtFCFA(v?.cash ?? 0)}`} />
              </div>
              <Section title="Positions" actions={<Button variant="outline" size="sm" onClick={pdf} disabled={!v}><FileDown /> Rapport PDF</Button>}>
                {v && v.positions.length > 0 ? (
                  <>
                    {v.positions.map((p) => (
                      <KeyValue key={p.securityId} label={`${sec(p.securityId)?.ticker} · ${fmtNum(p.quantity)} titres`} value={<>{fmtFCFA(p.value)} <Money value={p.unrealized} signed tone className="ml-2 text-xs" /></>} />
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune opération rangée ici pour l'instant.</p>
                )}
              </Section>
            </>
          )}
          <Section title="Ranger les opérations" description="Choisis le sous-portefeuille de chaque opération." data-tour="assign">
            <DataTable
              rows={all.rawTxs}
              rowKey={(t) => t.id}
              empty="Aucune opération."
              columns={[
                { key: "d", header: "Date", cell: (t) => fmtDate(t.date) },
                { key: "ty", header: "Type", cell: (t) => TX_LABEL[t.type] },
                { key: "s", header: "Titre", cell: (t) => sec(t.security_id)?.ticker ?? "—" },
                { key: "m", header: "Montant", align: "right", cell: (t) => fmtNum(t.type === "acquisition" || t.type === "cession" ? t.quantity * t.price : t.amount) },
                { key: "sp", header: "Sous-portefeuille", cell: (t) => (
                  <Select value={t.sub_portfolio_id ?? "none"} onValueChange={(val) => assign(t.id, val)}>
                    <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucun</SelectItem>
                      {subs.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) },
              ]}
            />
          </Section>
        </div>
      </div>
    </>
  );
}
