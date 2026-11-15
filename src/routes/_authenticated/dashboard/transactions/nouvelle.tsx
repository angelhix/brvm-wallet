import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { txQueryKey, useAnalytics, useSubPortfolios } from "@/lib/portfolio";
import { IRVM_RATES, TX_TYPES } from "@/lib/constants";
import { feeRatio, type TxType } from "@/lib/engine";
import { fmtFCFA, fmtNum, fmtPct, todayIso } from "@/lib/format";
import { parseNumber } from "@/lib/import";

export const Route = createFileRoute("/_authenticated/dashboard/transactions/nouvelle")({
  head: () => ({ meta: [{ title: "Nouvelle transaction — Kauri" }, { name: "description", content: "Saisis un achat, une vente, un dépôt, un retrait, un dividende ou des frais." }] }),
  component: Nouvelle,
});

function Nouvelle() {
  const a = useAnalytics();
  const subs = useSubPortfolios();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [type, setType] = useState<TxType>("acquisition");
  const [date, setDate] = useState(todayIso());
  const [securityId, setSecurityId] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("");
  const [amount, setAmount] = useState("");
  const [taxRate, setTaxRate] = useState<string | null>(null);
  const [sub, setSub] = useState("none");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const secs = useMemo(() => [...a.securities.values()].sort((x, y) => x.ticker.localeCompare(y.ticker)), [a.securities]);
  const security = a.securities.get(securityId);
  const isTrade = type === "acquisition" || type === "cession";
  const needsSecurity = isTrade || type === "dividende";
  const q = parseNumber(qty) ?? 0;
  const p = parseNumber(price) ?? 0;
  const f = parseNumber(fees) ?? 0;
  const amt = parseNumber(amount) ?? 0;
  const defaultRate = security ? (IRVM_RATES[security.country] ?? 0.1) : 0.1;
  const rate = taxRate === null ? defaultRate : (parseNumber(taxRate) ?? 0) / 100;
  const tax = type === "dividende" ? Math.round(amt * rate) : 0;
  const held = security && a.valuation ? (a.valuation.positions.find((x) => x.securityId === security.securityId)?.quantity ?? 0) : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!a.portfolio) return;
    if (needsSecurity && !securityId) { toast.error("Choisis un titre."); return; }
    if (isTrade && (q <= 0 || p <= 0)) { toast.error("La quantité et le prix doivent être positifs."); return; }
    if (!isTrade && amt <= 0) { toast.error("Le montant doit être positif."); return; }
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      portfolio_id: a.portfolio.id,
      type,
      date,
      security_id: needsSecurity ? securityId : null,
      quantity: isTrade ? q : 0,
      price: isTrade ? p : 0,
      fees: isTrade ? Math.round(f) : 0,
      amount: isTrade ? 0 : Math.round(amt),
      tax,
      sub_portfolio_id: sub === "none" ? null : sub,
      note: note.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Opération enregistrée.");
    await qc.invalidateQueries({ queryKey: txQueryKey(a.portfolio.id) });
    navigate({ to: "/dashboard/transactions" });
  }

  return (
    <>
      <PageHeader eyebrow="Transactions" title="Nouvelle transaction" description="Chaque opération est marquée Entrée ou Sortie de trésorerie." />
      <form onSubmit={submit} className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Section title="Opération">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Type</Label>
              <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {TX_TYPES.map((t) => (
                  <Button key={t.value} type="button" variant={type === t.value ? "default" : "outline"} size="sm" onClick={() => setType(t.value)}>{t.label}</Button>
                ))}
              </div>
            </div>
            <div><Label htmlFor="date">Date</Label><Input id="date" type="date" required value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} /></div>
            {needsSecurity && (
              <div>
                <Label>Titre</Label>
                <Select value={securityId} onValueChange={setSecurityId}>
                  <SelectTrigger><SelectValue placeholder="Choisir un titre" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {secs.map((s) => <SelectItem key={s.securityId} value={s.securityId}>{s.ticker} — {s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {security && <p className="mt-1 text-xs text-muted-foreground">Dernier cours {fmtNum(security.close)} · tu détiens {fmtNum(held)} titres</p>}
              </div>
            )}
            {isTrade ? (
              <>
                <div><Label htmlFor="qty">Quantité</Label><Input id="qty" inputMode="decimal" required value={qty} onChange={(e) => setQty(e.target.value)} /></div>
                <div><Label htmlFor="price">Prix unitaire (FCFA)</Label><Input id="price" inputMode="decimal" required value={price} onChange={(e) => setPrice(e.target.value)} placeholder={security?.close ? String(security.close) : ""} /></div>
                <div><Label htmlFor="fees">Frais (FCFA)</Label><Input id="fees" inputMode="decimal" value={fees} onChange={(e) => setFees(e.target.value)} /></div>
              </>
            ) : (
              <div><Label htmlFor="amount">{type === "dividende" ? "Dividende brut (FCFA)" : "Montant (FCFA)"}</Label><Input id="amount" inputMode="decimal" required value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            )}
            {type === "dividende" && (
              <div><Label htmlFor="irvm">Taux IRVM (%)</Label><Input id="irvm" inputMode="decimal" value={taxRate ?? String(defaultRate * 100)} onChange={(e) => setTaxRate(e.target.value)} /><p className="mt-1 text-xs text-muted-foreground">Taux indicatif du pays, modifiable.</p></div>
            )}
            {(subs.data?.length ?? 0) > 0 && (
              <div>
                <Label>Sous-portefeuille</Label>
                <Select value={sub} onValueChange={setSub}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {subs.data!.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="sm:col-span-2"><Label htmlFor="note">Note</Label><Textarea id="note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </div>
        </Section>
        <Section title="Résumé">
          {isTrade ? (
            <div className="space-y-2 text-sm">
              <p className="flex justify-between"><span>Montant brut</span><span className="tabular">{fmtFCFA(q * p)}</span></p>
              <p className="flex justify-between"><span>Frais</span><span className="tabular">+{fmtNum(f)} FCFA · {fmtPct(feeRatio({ quantity: q, price: p, fees: f }))}</span></p>
              <p className="flex justify-between border-t pt-2 font-semibold"><span>{type === "acquisition" ? "Sortie de trésorerie" : "Entrée de trésorerie"}</span><span className="tabular">{fmtFCFA(type === "acquisition" ? q * p + f : q * p - f)}</span></p>
              {type === "cession" && q > held && <p className="text-loss">Tu ne détiens que {fmtNum(held)} titres aujourd'hui.</p>}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              {type === "dividende" && <p className="flex justify-between"><span>IRVM retenu</span><span className="tabular">{fmtFCFA(tax)}</span></p>}
              <p className="flex justify-between border-t pt-2 font-semibold"><span>{type === "depot" || type === "dividende" ? "Entrée de trésorerie" : "Sortie de trésorerie"}</span><span className="tabular">{fmtFCFA(amt - tax)}</span></p>
            </div>
          )}
          <Button type="submit" className="mt-6 w-full" size="lg" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</Button>
        </Section>
      </form>
    </>
  );
}
