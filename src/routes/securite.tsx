import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, Database, Download, KeyRound, Lock, ShieldCheck } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/securite")({
  head: () => ({
    meta: [
      { title: "Sécurité — Zéro accès bancaire | Kauri" },
      { name: "description", content: "Kauri ne demande jamais d'identifiant bancaire ni d'accès SGI. Chiffrement, isolation des données et export libre." },
      { property: "og:title", content: "Sécurité — Kauri" },
      { property: "og:description", content: "Zéro accès bancaire, données chiffrées et isolées, export libre." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SecurityPage,
});

const ITEMS = [
  { icon: Ban, t: "Zéro accès bancaire", d: "Kauri ne te demandera jamais tes identifiants bancaires ni l'accès à ton compte-titres SGI. Tu saisis ou importes toi-même tes opérations." },
  { icon: Lock, t: "Chiffrement partout", d: "Toutes les connexions passent en HTTPS. Les mots de passe sont hachés, jamais stockés en clair." },
  { icon: Database, t: "Données isolées", d: "Chaque ligne de ta base est rattachée à ton compte et protégée par des règles de sécurité au niveau de la base : personne d'autre ne peut la lire." },
  { icon: KeyRound, t: "Connexion protégée", d: "Vérification de l'adresse email, limitation des tentatives de connexion, réinitialisation sécurisée du mot de passe." },
  { icon: Download, t: "Tes données restent tiennes", d: "Jamais revendues. Exporte tout (CSV, Excel, PDF, JSON) à tout moment, ou supprime ton compte en libre-service." },
  { icon: ShieldCheck, t: "Hébergement géré", d: "Base de données gérée avec sauvegardes quotidiennes. Les actions d'administration sont tracées dans un journal d'audit." },
];

function SecurityPage() {
  return (
    <SiteLayout>
      <section className="border-b bg-ink text-ink-foreground">
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Sécurité</p>
          <h1 className="mt-2 text-5xl font-bold">Notre engagement : zéro accès bancaire.</h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-muted">Kauri calcule ta performance à partir de ce que tu saisis. Rien de plus. Voici comment nous protégeons tes informations.</p>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <div key={it.t} className="rounded-2xl border bg-card p-6 shadow-card">
            <it.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{it.t}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{it.d}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-secondary p-6">
          <p className="text-lg font-semibold">Une question sur la sécurité de tes données ?</p>
          <Button asChild variant="ink">
            <Link to="/contact">Nous écrire</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
