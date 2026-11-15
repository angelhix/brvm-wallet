import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, BarChart3, Calculator, FileUp, FolderTree, LineChart } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteLayout } from "@/components/site/site-layout";
import { FAQ } from "@/lib/faq";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/aide")({
  head: () => ({
    meta: [
      { title: "Centre d'aide — Kauri" },
      { name: "description", content: "Guides pour saisir tes transactions, importer un relevé SGI et comprendre tes indicateurs de performance BRVM." },
      { property: "og:title", content: "Centre d'aide — Kauri" },
      { property: "og:description", content: "Guides et questions fréquentes sur Kauri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

const GUIDES = [
  {
    icon: ArrowLeftRight,
    t: "Saisir une transaction",
    steps: [
      "Clique sur « Nouvelle transaction » en haut de l'écran.",
      "Choisis le type : dépôt, acquisition, cession, dividende, retrait ou frais.",
      "Pour un achat ou une vente : titre, quantité, prix unitaire et frais (montant ou %).",
      "Valide : la vue d'ensemble se met à jour aussitôt.",
    ],
  },
  {
    icon: FileUp,
    t: "Importer un relevé SGI",
    steps: [
      "Va dans Transactions → Importer.",
      "Dépose ton fichier CSV ou Excel (ou télécharge notre modèle).",
      "Vérifie chaque ligne : Kauri signale les titres inconnus et les erreurs.",
      "Valide l'import : trésorerie et actions sont séparées automatiquement.",
    ],
  },
  {
    icon: Calculator,
    t: "Comprendre le gain total",
    steps: [
      "Apports nets = dépôts − retraits.",
      "Liquidité = apports − achats + ventes + dividendes nets − frais.",
      "Valeur totale = valeur des titres au dernier cours + liquidité.",
      "Gain total = valeur totale − apports nets.",
    ],
  },
  {
    icon: LineChart,
    t: "Lire l'indice base 100",
    steps: [
      "Ton portefeuille démarre à 100 le jour de ta première opération.",
      "Les dépôts et retraits sont neutralisés (méthode de la valeur de part).",
      "Le BRVM Composite est rebasé à 100 à la même date.",
      "L'écart en points montre si tu fais mieux que le marché.",
    ],
  },
  {
    icon: FolderTree,
    t: "Organiser en sous-portefeuilles",
    steps: [
      "Crée des groupes par objectif : Retraite, Études, Spéculatif…",
      "Affecte chaque opération à un sous-portefeuille lors de la saisie.",
      "Chaque groupe a sa performance, sa liquidité et son rapport PDF.",
    ],
  },
  {
    icon: BarChart3,
    t: "Explorer le marché",
    steps: [
      "Analyse globale : palmarès du jour, résiduelles, volumes, dividendes.",
      "Fiche titre : fondamentaux, ratios et historique de dividendes.",
      "Screener : filtre les 48 titres par secteur, variation, rendement, PER.",
    ],
  },
];

function HelpPage() {
  const { user } = useAuth();
  return (
    <SiteLayout>
      <section className="border-b bg-grain">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Centre d'aide</p>
          <h1 className="mt-2 text-5xl font-bold">Comment pouvons-nous t'aider ?</h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Des guides courts pour bien démarrer, et les réponses aux questions fréquentes.</p>
          {user && (
            <Button asChild className="mt-6" variant="outline">
              <Link to="/dashboard">← Retour au tableau de bord</Link>
            </Button>
          )}
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <article key={g.t} className="rounded-2xl border bg-card p-6 shadow-card">
            <g.icon className="h-6 w-6 text-primary" />
            <h2 className="mt-3 text-lg font-semibold">{g.t}</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
              {g.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </article>
        ))}
      </section>
      <section className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <h2 className="text-3xl font-bold">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="mt-6">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <p className="mt-10 text-muted-foreground">
          Tu ne trouves pas ta réponse ?{" "}
          <Link to="/contact" className="font-semibold text-foreground underline underline-offset-4">Écris-nous</Link>
          {user && (
            <>
              {" "}ou{" "}
              <Link to="/rendez-vous" className="font-semibold text-foreground underline underline-offset-4">prends rendez-vous</Link>
            </>
          )}
          .
        </p>
      </section>
    </SiteLayout>
  );
}
