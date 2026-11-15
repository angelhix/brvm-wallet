import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Gift, Mail, MessageCircle, Users } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Section, StatCard } from "@/components/app/kpi";
import { DataTable } from "@/components/app/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { db } from "@/lib/local-db";
import { fmtDate, fmtNum } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/parrainage")({
  head: () => ({
    meta: [
      { title: "Parrainage — Kauri" },
      { name: "description", content: "Ton lien de parrainage unique, tes statistiques et la liste de tes filleuls." },
    ],
  }),
  component: Parrainage,
});

const LEVELS = [
  { n: 1, label: "Premier filleul" },
  { n: 3, label: "Relais" },
  { n: 10, label: "Ambassadeur" },
  { n: 25, label: "Pilier de la communauté" },
];

interface Referral { id: string; referred_label: string; created_at: string }

function Parrainage() {
  const { user } = useAuth();
  const profile = useProfile();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const refs = useQuery({
    queryKey: ["referrals", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Referral[]> => {
      const { data, error } = await db.from("referrals").select("*").eq("referrer_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const code = profile.data?.referral_code ?? "";
  const link = code ? `${origin}/signup?ref=${code}` : "";
  const list = refs.data ?? [];
  const month = new Date().toISOString().slice(0, 7);
  const thisMonth = list.filter((r) => r.created_at.slice(0, 7) === month).length;
  const next = LEVELS.find((l) => l.n > list.length);
  const msg = `J'utilise Kauri pour voir ma vraie performance à la BRVM, gratuitement. Inscris-toi avec mon lien : ${link}`;

  async function copy() {
    await navigator.clipboard.writeText(link);
    toast.success("Lien copié.");
  }

  return (
    <>
      <PageHeader title="Parrainage" description="Kauri est gratuit pour tout le monde. Fais-le connaître aux investisseurs BRVM autour de toi." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Filleuls inscrits" value={fmtNum(list.length)} icon={<Users className="h-4 w-4" />} emphasis />
        <StatCard label="Ce mois-ci" value={fmtNum(thisMonth)} sub="Nouvelles inscriptions" />
        <StatCard label="Niveau" value={[...LEVELS].reverse().find((l) => l.n <= list.length)?.label ?? "Débutant"} sub={next ? `Encore ${next.n - list.length} pour « ${next.label} »` : "Niveau maximum atteint"} icon={<Gift className="h-4 w-4" />} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section title="Ton lien unique" className="lg:col-span-2" description={`Code : ${code || "…"}`}>
          <div className="flex flex-wrap gap-2">
            <Input readOnly value={link} className="min-w-[260px] flex-1 font-mono text-sm" aria-label="Lien de parrainage" onFocus={(e) => e.target.select()} />
            <Button onClick={copy} disabled={!link}><Copy /> Copier</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>
            <Button asChild variant="outline"><a href={`mailto:?subject=${encodeURIComponent("Découvre Kauri")}&body=${encodeURIComponent(msg)}`}><Mail /> Email</a></Button>
          </div>
        </Section>
        <Section title="Comment ça marche">
          <ol className="list-decimal space-y-2 pl-4 text-sm text-muted-foreground">
            <li>Partage ton lien.</li>
            <li>Ton ami crée son compte gratuit avec ce lien.</li>
            <li>Il apparaît ici, de façon anonymisée.</li>
          </ol>
        </Section>
      </div>
      <Section title="Tes filleuls" className="mt-4" description="Les adresses sont masquées pour protéger leur vie privée.">
        <DataTable
          rows={list}
          rowKey={(r) => r.id}
          empty="Aucun filleul pour l'instant. Partage ton lien !"
          columns={[
            { key: "l", header: "Filleul", cell: (r) => <span className="font-medium">{r.referred_label}</span> },
            { key: "d", header: "Inscrit le", cell: (r) => fmtDate(r.created_at) },
            { key: "s", header: "Statut", cell: () => <span className="rounded-full bg-gain-soft px-2 py-0.5 text-xs font-semibold text-gain">Inscrit</span> },
          ]}
        />
      </Section>
    </>
  );
}
