import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Mail, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Section, StatCard } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { ErrorState, LoadingGrid } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, useIsAdmin } from "@/hooks/use-auth";
import { db } from "@/lib/local-db";
import { market } from "@/lib/demo-market";
import { fmtDate, fmtNum, fmtPct } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Back-office — Kauri" },
      { name: "description", content: "Administration Kauri : utilisateurs, messages de contact, rendez-vous et supervision des données de marché." },
    ],
  }),
  component: Admin,
});

interface AdminUser { id: string; email: string; first_name: string | null; created_at: string; last_sign_in_at: string | null; suspended: boolean; is_admin: boolean; portfolios: number; transactions: number; referrals: number }
interface Message { id: string; name: string; email: string; subject: string; message: string; handled: boolean; created_at: string }
interface Appt { id: string; user_id: string; date: string; slot: string; topic: string; status: string; note: string | null }
interface Audit { id: string; action: string; target: string; created_at: string }

function useList<T>(key: string, fn: () => PromiseLike<{ data: unknown; error: Error | null }>) {
  return useQuery({ queryKey: ["admin", key], queryFn: async () => { const { data, error } = await fn(); if (error) throw error; return (data ?? []) as T[]; } });
}

function Admin() {
  const isAdmin = useIsAdmin();
  if (isAdmin.isLoading) return <LoadingGrid />;
  if (!isAdmin.data)
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-card">
        <ShieldAlert className="mx-auto h-8 w-8 text-loss" />
        <h1 className="mt-3 text-xl font-bold">Accès réservé</h1>
        <p className="mt-1 text-muted-foreground">Cet espace est réservé aux administrateurs.</p>
        <Button asChild className="mt-4"><Link to="/dashboard">Retour</Link></Button>
      </div>
    );
  return <AdminPanel />;
}

function AdminPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const users = useList<AdminUser>("users", () => db.rpc("admin_users"));
  const msgs = useList<Message>("messages", () => db.from("contact_messages").select("*").order("created_at", { ascending: false }));
  const appts = useList<Appt>("appointments", () => db.from("appointments").select("*").order("date", { ascending: false }));
  const audit = useList<Audit>("audit", () => db.from("audit_log").select("*").order("created_at", { ascending: false }).limit(20));
  const [q, setQ] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const supervision = useMemo(() => {
    const m = market();
    const last = m.calendar[m.calendar.length - 1]!;
    const rows = m.securities.map((s) => {
      const bars = m.bars.get(s.id) ?? [];
      const b = bars[bars.length - 1];
      const p = bars[bars.length - 2];
      const ch = b && p ? b.close / p.close - 1 : 0;
      return { ...s, bars: bars.length, last: b?.date ?? null, ch, volume: b?.volume ?? 0, stale: b?.date !== last, anomaly: Math.abs(ch) > 0.075 };
    });
    return { last, rows, sessions: m.calendar.length, stale: rows.filter((r) => r.stale).length, anomalies: rows.filter((r) => r.anomaly) };
  }, []);

  if (users.error) return <ErrorState error={users.error} />;
  if (users.isLoading) return <LoadingGrid />;
  const u = users.data ?? [];
  const email = (id: string) => u.find((x) => x.id === id)?.email ?? "—";
  const week = new Date(Date.now() - 7 * 86400000).toISOString();
  const unread = (msgs.data ?? []).filter((m) => !m.handled).length;

  async function setRole(x: AdminUser, admin: boolean) {
    const { error } = await db.rpc("admin_set_role", { user_id: x.id, admin });
    if (error) { toast.error(error.message); return; }
    toast.success(admin ? "Rôle admin accordé." : "Rôle admin retiré.");
    refresh();
  }
  async function setSuspended(x: AdminUser, suspended: boolean) {
    const { error } = await db.rpc("admin_set_suspended", { user_id: x.id, suspended });
    if (error) { toast.error(error.message); return; }
    toast.success(suspended ? "Compte suspendu." : "Compte réactivé.");
    refresh();
  }
  async function toggleHandled(m: Message) {
    const { error } = await db.from("contact_messages").update({ handled: !m.handled }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    await db.from("audit_log").insert({ actor_id: user?.id, action: m.handled ? "Message rouvert" : "Message traité", target: m.subject });
    refresh();
  }
  async function setStatus(a: Appt, status: string) {
    const { error } = await db.from("appointments").update({ status }).eq("id", a.id);
    if (error) { toast.error(error.message); return; }
    refresh();
  }
  async function check() {
    await db.from("audit_log").insert({ actor_id: user?.id, action: "Contrôle des données", target: `${supervision.rows.length} titres · ${supervision.anomalies.length} anomalies` });
    toast.success("Contrôle terminé et consigné dans le journal.");
    refresh();
  }

  const filtered = u.filter((x) => !q || (x.email + (x.first_name ?? "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader eyebrow="Administration" title="Back-office" description="Toutes les actions sont consignées dans le journal d'audit." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Utilisateurs" value={fmtNum(u.length)} sub={`${u.filter((x) => (x.last_sign_in_at ?? "") > week).length} actifs sur 7 jours`} emphasis />
        <StatCard label="Transactions" value={fmtNum(u.reduce((s, x) => s + x.transactions, 0))} sub={`${u.reduce((s, x) => s + x.portfolios, 0)} portefeuilles`} />
        <StatCard label="Messages à traiter" value={fmtNum(unread)} sub={`${msgs.data?.length ?? 0} au total`} />
        <StatCard label="Dernière séance" value={fmtDate(supervision.last)} sub={supervision.stale ? `${supervision.stale} titres en retard` : "48/48 titres à jour"} />
      </div>
      <Tabs defaultValue="users">
        <TabsList className="mb-4 h-10">
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="messages">Messages{unread > 0 && <span className="ml-1.5 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">{unread}</span>}</TabsTrigger>
          <TabsTrigger value="rdv">Rendez-vous</TabsTrigger>
          <TabsTrigger value="data">Données de marché</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Section title="Utilisateurs" actions={<Input placeholder="Rechercher" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 w-56" aria-label="Rechercher un utilisateur" />}>
            <DataTable
              rows={filtered}
              rowKey={(x) => x.id}
              columns={[
                { key: "e", header: "Utilisateur", cell: (x) => (<div><span className="font-medium">{x.first_name ?? "—"}</span><span className="block text-xs text-muted-foreground">{x.email}</span></div>) },
                { key: "c", header: "Inscrit", cell: (x) => fmtDate(x.created_at) },
                { key: "l", header: "Dernière connexion", cell: (x) => fmtDate(x.last_sign_in_at) },
                { key: "t", header: "Opérations", align: "right", cell: (x) => fmtNum(x.transactions) },
                { key: "r", header: "Filleuls", align: "right", cell: (x) => fmtNum(x.referrals) },
                { key: "a", header: "Admin", cell: (x) => <Switch checked={x.is_admin} disabled={x.id === user?.id} onCheckedChange={(v) => setRole(x, v)} aria-label={`Admin ${x.email}`} /> },
                { key: "s", header: "Statut", cell: (x) => (
                  <Button size="sm" variant={x.suspended ? "outline" : "ghost"} disabled={x.id === user?.id} onClick={() => setSuspended(x, !x.suspended)}>
                    {x.suspended ? "Réactiver" : "Suspendre"}
                  </Button>
                ) },
              ]}
            />
          </Section>
        </TabsContent>

        <TabsContent value="messages">
          <div className="space-y-3">
            {(msgs.data ?? []).map((m) => (
              <div key={m.id} className={cn("rounded-xl border bg-card p-4 shadow-card", !m.handled && "border-primary/60")}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{m.subject}</p>
                    <p className="text-xs text-muted-foreground">{m.name} · {m.email} · {fmtDate(m.created_at)}</p>
                  </div>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", m.handled ? "bg-gain-soft text-gain" : "bg-gold-soft")}>{m.handled ? "Traité" : "À traiter"}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{m.message}</p>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline"><a href={`mailto:${m.email}?subject=${encodeURIComponent("Re : " + m.subject)}`}><Mail /> Répondre</a></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleHandled(m)}><CheckCircle2 /> {m.handled ? "Rouvrir" : "Marquer traité"}</Button>
                </div>
              </div>
            ))}
            {(msgs.data ?? []).length === 0 && <p className="text-muted-foreground">Aucun message.</p>}
          </div>
        </TabsContent>

        <TabsContent value="rdv">
          <Section title="Rendez-vous">
            <DataTable
              rows={appts.data ?? []}
              rowKey={(a) => a.id}
              columns={[
                { key: "d", header: "Date", cell: (a) => `${fmtDate(a.date)} · ${a.slot}` },
                { key: "u", header: "Utilisateur", cell: (a) => email(a.user_id) },
                { key: "t", header: "Sujet", cell: (a) => a.topic },
                { key: "s", header: "Statut", cell: (a) => (
                  <Select value={a.status} onValueChange={(v) => setStatus(a, v)}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{["demandé", "confirmé", "terminé", "annulé"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                ) },
              ]}
            />
          </Section>
        </TabsContent>

        <TabsContent value="data">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Couverture" value={`${supervision.rows.length - supervision.stale}/${supervision.rows.length}`} sub="Titres cotés à la dernière séance" />
              <StatCard label="Séances en base" value={fmtNum(supervision.sessions)} sub="Jours ouvrés sur un an" />
              <StatCard label="Variations anormales" value={fmtNum(supervision.anomalies.length)} sub="Au-delà de ±7,5 % (seuil BRVM)" />
            </div>
            <Section title="Contrôle des cours" description="Source : données de démonstration" actions={<Button size="sm" onClick={check}>Lancer un contrôle</Button>}>
              <DataTable
                rows={supervision.rows}
                rowKey={(r) => r.id}
                columns={[
                  { key: "t", header: "Titre", cell: (r) => <span className="font-semibold">{r.ticker}</span> },
                  { key: "l", header: "Dernier cours", cell: (r) => fmtDate(r.last) },
                  { key: "b", header: "Séances", align: "right", cell: (r) => fmtNum(r.bars) },
                  { key: "c", header: "Variation", align: "right", cell: (r) => fmtPct(r.ch, { signed: true }) },
                  { key: "v", header: "Volume", align: "right", cell: (r) => fmtNum(r.volume) },
                  { key: "s", header: "État", cell: (r) => r.stale || r.anomaly
                    ? <span className="inline-flex items-center gap-1 text-xs text-loss"><AlertTriangle className="h-3.5 w-3.5" /> {r.stale ? "En retard" : "À vérifier"}</span>
                    : <span className="inline-flex items-center gap-1 text-xs text-gain"><CheckCircle2 className="h-3.5 w-3.5" /> OK</span> },
                ]}
              />
            </Section>
            <Section title="Journal d'audit">
              <ul className="space-y-2 text-sm">
                {(audit.data ?? []).map((a) => (
                  <li key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-dashed pb-2 last:border-0">
                    <span><span className="font-medium">{a.action}</span> · <span className="text-muted-foreground">{a.target}</span></span>
                    <span className="text-xs text-muted-foreground">{fmtDate(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
