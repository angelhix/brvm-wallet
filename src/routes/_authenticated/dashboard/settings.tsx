import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Briefcase, CheckCircle2, Compass, Download, FileJson, KeyRound, Lock, Plus, RotateCcw, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/kpi";
import { TOUR_ZONES } from "@/components/app/tour";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { db, resetDemoData } from "@/lib/local-db";
import { usePortfolio, type TxRow } from "@/lib/portfolio";
import { useSecurityLookup } from "@/lib/portfolio";
import { TX_LABEL } from "@/lib/constants";
import { exportCsv, exportXlsx, type Cell } from "@/lib/export";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Paramètres — Kauri" },
      { name: "description", content: "Profil, sécurité, portefeuilles, visites guidées et export de tes données Kauri." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [tab, setTab] = useState("profil");
  return (
    <>
      <PageHeader title="Paramètres" description="Ton compte, tes portefeuilles et tes données. Tout est gratuit et exportable à tout moment." />
      <Tabs value={tab} onValueChange={setTab} orientation="vertical" className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <TabsList className="h-auto w-full flex-row justify-start gap-1 overflow-x-auto bg-transparent p-0 lg:flex-col lg:items-stretch">
          {[
            ["profil", "Profil", UserRound],
            ["securite", "Sécurité", Lock],
            ["portefeuille", "Portefeuilles", Briefcase],
            ["visites", "Visites guidées", Compass],
            ["donnees", "Mes données", FileJson],
          ].map(([v, l, Icon]) => {
            const I = Icon as typeof UserRound;
            return (
              <TabsTrigger key={v as string} value={v as string} className="justify-start gap-2 px-3 py-2 data-[state=active]:bg-card data-[state=active]:shadow-card">
                <I className="h-4 w-4" /> {l as string}
              </TabsTrigger>
            );
          })}
        </TabsList>
        <div className="min-w-0">
          <TabsContent value="profil" className="mt-0"><Profil /></TabsContent>
          <TabsContent value="securite" className="mt-0"><Securite /></TabsContent>
          <TabsContent value="portefeuille" className="mt-0"><Portefeuilles /></TabsContent>
          <TabsContent value="visites" className="mt-0"><Visites /></TabsContent>
          <TabsContent value="donnees" className="mt-0"><Donnees /></TabsContent>
        </div>
      </Tabs>
    </>
  );
}

function Profil() {
  const { user } = useAuth();
  const profile = useProfile();
  const qc = useQueryClient();
  const [first, setFirst] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setFirst(profile.data?.first_name ?? "");
    setEmail(user?.email ?? "");
  }, [profile.data, user]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await db.from("profiles").update({ first_name: first.trim().slice(0, 60) || null }).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile", user.id] });
    toast.success("Profil mis à jour.");
  }
  async function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      toast.error("Adresse email invalide.");
      return;
    }
    setBusy(true);
    const { error } = await db.auth.updateUser({ email: v });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    toast.success("Adresse email mise à jour.");
  }

  return (
    <div className="space-y-4">
      <Section title="Profil" description="Ton prénom s'affiche dans l'en-tête de l'application.">
        <form onSubmit={saveName} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="first">Prénom</Label>
            <Input id="first" value={first} maxLength={60} onChange={(e) => setFirst(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy}>Enregistrer</Button>
        </form>
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Membre depuis</dt><dd className="font-medium">{fmtDate(profile.data?.created_at)}</dd></div>
          <div><dt className="text-muted-foreground">Code de parrainage</dt><dd className="font-medium tabular">{profile.data?.referral_code ?? "—"}</dd></div>
        </dl>
      </Section>
      <Section title="Adresse email" description="Elle sert à te connecter et à recevoir les réponses du support.">
        <form onSubmit={saveEmail} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1 space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" variant="outline" disabled={busy || email.trim() === user?.email}>Changer d'email</Button>
        </form>
      </Section>
    </div>
  );
}

function Securite() {
  const { user } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      toast.error("8 caractères minimum.");
      return;
    }
    if (next !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    if (!user) return;
    setBusy(true);
    const check = await db.auth.signInWithPassword({ email: user.email, password: current });
    if (check.error) {
      setBusy(false);
      toast.error("Mot de passe actuel incorrect.");
      return;
    }
    const { error } = await db.auth.updateUser({ password: next });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCurrent("");
    setNext("");
    setConfirm("");
    toast.success("Mot de passe mis à jour.");
  }
  const strength = [next.length >= 8, /[A-Z]/.test(next), /\d/.test(next), /[^A-Za-z0-9]/.test(next)].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <Section title="Mot de passe">
        <form onSubmit={submit} className="grid max-w-md gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cur">Mot de passe actuel</Label>
            <Input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new">Nouveau mot de passe</Label>
            <Input id="new" type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
            <div className="flex gap-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i < strength ? (strength >= 3 ? "bg-gain" : "bg-primary") : "bg-muted"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">8 caractères minimum. Ajoute une majuscule, un chiffre et un symbole pour le renforcer.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conf">Confirme le nouveau mot de passe</Label>
            <Input id="conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy} className="justify-self-start"><KeyRound /> Mettre à jour</Button>
        </form>
      </Section>
      <Section title="Session">
        <p className="text-sm text-muted-foreground">Dernière connexion : {fmtDate(user?.last_sign_in_at)}</p>
      </Section>
      <Section title="Nos engagements">
        <ul className="space-y-2 text-sm">
          {[
            "Aucun accès bancaire ni identifiant SGI n'est jamais demandé.",
            "Tes données ne sont jamais revendues et restent exportables à tout moment.",
            "Les relevés importés sont lus puis supprimés : seules les opérations validées sont gardées.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gain" /> {t}</li>
          ))}
        </ul>
        <Link to="/securite" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">En savoir plus sur la sécurité</Link>
      </Section>
    </div>
  );
}

function Portefeuilles() {
  const { portfolios, portfolio, setPortfolioId } = usePortfolio();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [names, setNames] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["portfolios", user?.id] });

  async function rename(id: string) {
    const n = (names[id] ?? "").trim();
    if (!n) return;
    const { error } = await db.from("portfolios").update({ name: n.slice(0, 60) }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Portefeuille renommé.");
    refresh();
  }
  async function toggleCash(id: string, v: boolean) {
    const { error } = await db.from("portfolios").update({ cash_tracking: v }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
    qc.invalidateQueries({ queryKey: ["transactions"] });
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const n = newName.trim();
    if (!n) return;
    if (portfolios.length >= 10) {
      toast.error("10 portefeuilles maximum.");
      return;
    }
    const { data, error } = await db.from("portfolios").insert({ name: n.slice(0, 60), cash_tracking: true, currency: "XOF" }).select().single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    await refresh();
    setPortfolioId(data.id);
    toast.success(`« ${n} » créé et sélectionné.`);
  }
  async function remove(id: string) {
    const { error } = await db.from("portfolios").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Portefeuille supprimé avec ses opérations.");
    if (portfolio?.id === id) {
      const other = portfolios.find((p) => p.id !== id);
      if (other) setPortfolioId(other.id);
    }
    refresh();
  }

  return (
    <div className="space-y-4">
      <Section title="Tes comptes-titres" description="Un portefeuille par compte SGI. Les sous-portefeuilles servent à regrouper des lignes dans un même compte.">
        <ul className="space-y-4">
          {portfolios.map((p) => (
            <li key={p.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[200px] flex-1 space-y-1.5">
                  <Label htmlFor={`pf-${p.id}`}>Nom {portfolio?.id === p.id && <span className="ml-1 rounded-full bg-gold-soft px-2 py-0.5 text-[0.65rem] font-semibold">Affiché</span>}</Label>
                  <Input id={`pf-${p.id}`} defaultValue={p.name} maxLength={60} onChange={(e) => setNames((s) => ({ ...s, [p.id]: e.target.value }))} />
                </div>
                <Button variant="outline" onClick={() => rename(p.id)} disabled={!names[p.id] || names[p.id] === p.name}>Renommer</Button>
                {portfolio?.id !== p.id && <Button variant="ghost" onClick={() => setPortfolioId(p.id)}>Afficher</Button>}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Supprimer ${p.name}`} disabled={portfolios.length <= 1}><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Supprimer « {p.name} » ?</AlertDialogTitle>
                      <AlertDialogDescription>Toutes les opérations de ce portefeuille seront supprimées. Exporte-les d'abord si tu veux les garder.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={() => remove(p.id)}>Supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <label className="mt-4 flex items-start justify-between gap-4">
                <span>
                  <span className="block text-sm font-medium">Suivre la liquidité</span>
                  <span className="text-xs text-muted-foreground">Active-le si tu saisis tes dépôts et retraits. Sinon, chaque achat est considéré comme un apport.</span>
                </span>
                <Switch checked={p.cash_tracking} onCheckedChange={(v) => toggleCash(p.id, v)} aria-label="Suivre la liquidité" />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">Devise : FCFA · créé le {fmtDate(p.created_at)}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Nouveau portefeuille">
        <form onSubmit={create} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1 space-y-1.5">
            <Label htmlFor="newpf">Nom</Label>
            <Input id="newpf" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex. Compte SGI Dakar" maxLength={60} />
          </div>
          <Button type="submit" disabled={!newName.trim()}><Plus /> Créer</Button>
        </form>
        <Link to="/dashboard/sous-portefeuilles" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4">Gérer les sous-portefeuilles</Link>
      </Section>
    </div>
  );
}

function Visites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const seen = useQuery({
    queryKey: ["tour-progress", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await db.from("tour_progress").select("*");
      if (error) throw error;
      return new Map<string, string>((data ?? []).map((r: { zone: string; seen_at: string }) => [r.zone, r.seen_at]));
    },
  });
  async function resetAll() {
    const { error } = await db.from("tour_progress").delete().eq("user_id", user?.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["tour-progress", user?.id] });
    toast.success("Les visites se relanceront à ta prochaine visite de chaque écran.");
  }
  return (
    <Section
      title="Visites guidées"
      description="Une courte visite se lance la première fois que tu ouvres chaque zone. Revois-les quand tu veux."
      actions={<Button variant="outline" size="sm" onClick={resetAll}><RotateCcw /> Tout réactiver</Button>}
    >
      <ul className="divide-y">
        {TOUR_ZONES.map((z) => {
          const at = seen.data?.get(z.zone);
          return (
            <li key={z.zone} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span>
                <span className="block font-medium">{z.label}</span>
                <span className="text-xs text-muted-foreground">
                  {at ? (<span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-gain" /> Vue le {fmtDate(at)}</span>) : "Pas encore vue"}
                </span>
              </span>
              <Button size="sm" variant="outline" onClick={() => navigate({ href: `${z.path}?revoir-tour=${z.zone}` })}>
                <Compass /> Lancer la visite
              </Button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Donnees() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { map: secs } = useSecurityLookup();
  const [busy, setBusy] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function collect() {
    const [profiles, portfolios, subs, txs, appts, imports] = await Promise.all([
      db.from("profiles").select("*").eq("id", user?.id),
      db.from("portfolios").select("*"),
      db.from("sub_portfolios").select("*"),
      db.from("transactions").select("*").order("date"),
      db.from("appointments").select("*").eq("user_id", user?.id),
      db.from("imports").select("*"),
    ]);
    return { profile: profiles.data?.[0] ?? null, portfolios: portfolios.data ?? [], sub_portfolios: subs.data ?? [], transactions: (txs.data ?? []) as TxRow[], appointments: appts.data ?? [], imports: imports.data ?? [] };
  }
  async function exportJson() {
    setBusy(true);
    const data = await collect();
    setBusy(false);
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), service: "Kauri", ...data }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kauri-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Export complet téléchargé.");
  }
  async function exportTable(kind: "csv" | "xlsx") {
    setBusy(true);
    const { transactions, portfolios } = await collect();
    setBusy(false);
    const pf = new Map<string, string>(portfolios.map((p: { id: string; name: string }) => [p.id, p.name]));
    const head = ["Portefeuille", "Date", "Type", "Titre", "Quantité", "Prix", "Frais", "Montant", "IRVM", "Source", "Note"];
    const rows: Cell[][] = transactions.map((t) => [pf.get(t.portfolio_id) ?? "", t.date, TX_LABEL[t.type] ?? t.type, t.security_id ? (secs.get(t.security_id)?.ticker ?? "") : "", t.quantity || "", t.price || "", t.fees || "", t.amount || "", t.tax || "", t.source, t.note ?? ""]);
    const name = `kauri-toutes-transactions-${new Date().toISOString().slice(0, 10)}`;
    if (kind === "csv") exportCsv(name + ".csv", head, rows);
    else await exportXlsx(name + ".xlsx", "Transactions", head, rows);
  }
  async function deleteAccount() {
    const { error } = await db.rpc("delete_account");
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.clear();
    toast.success("Ton compte et tes données ont été supprimés.");
    navigate({ to: "/", replace: true });
  }
  function resetDemo() {
    resetDemoData();
    qc.clear();
    toast.success("Données de démonstration restaurées.");
    navigate({ to: "/login", search: { redirect: undefined }, replace: true });
  }

  return (
    <div className="space-y-4">
      <Section title="Exporter mes données" description="Tes données t'appartiennent. Télécharge-les quand tu veux, sans condition.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportJson} disabled={busy}><FileJson /> Export complet (JSON)</Button>
          <Button variant="outline" onClick={() => exportTable("csv")} disabled={busy}><Download /> Transactions (CSV)</Button>
          <Button variant="outline" onClick={() => exportTable("xlsx")} disabled={busy}><Download /> Transactions (Excel)</Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">L'export complet contient ton profil, tes portefeuilles, sous-portefeuilles, transactions, rendez-vous et historiques d'import.</p>
      </Section>
      <Section title="Données de démonstration" description="Cette version garde tout dans ton navigateur. Tu peux revenir à l'état d'origine à tout moment.">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline"><RotateCcw /> Réinitialiser la démo</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Réinitialiser les données ?</AlertDialogTitle>
              <AlertDialogDescription>Les comptes et opérations d'exemple sont restaurés, tes ajouts sont effacés et tu es déconnecté.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={resetDemo}>Réinitialiser</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Section>
      <Section title="Supprimer mon compte" className="border-destructive/40">
        <p className="text-sm text-muted-foreground">Ton compte, tes portefeuilles et toutes tes opérations seront définitivement supprimés.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="del">Tape SUPPRIMER pour confirmer</Label>
            <Input id="del" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-56" />
          </div>
          <Button variant="destructive" disabled={confirmText !== "SUPPRIMER"} onClick={deleteAccount}><Trash2 /> Supprimer définitivement</Button>
        </div>
      </Section>
    </div>
  );
}
