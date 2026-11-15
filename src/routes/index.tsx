import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, Ban, CircleDollarSign, LineChart, Lock, Receipt, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SiteLayout } from "@/components/site/site-layout";
import { FAQ } from "@/lib/faq";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kauri — Ton solde n'est pas ta performance | Suivi BRVM gratuit" },
      {
        name: "description",
        content:
          "Kauri sépare ta trésorerie de tes actions et calcule ta vraie rentabilité à la BRVM : plus-values, dividendes et frais compris, en FCFA. 100 % gratuit.",
      },
      { property: "og:title", content: "Kauri — Ton solde n'est pas ta performance" },
      { property: "og:description", content: "Suivi de portefeuille BRVM 100 % gratuit : ta vraie rentabilité en FCFA, sans accès bancaire." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <SiteLayout>
      <Hero />
      <Problem />
      <Solution />
      <Steps />
      <FreeBand />
      <Founder />
      <Faq />
      <FinalCta />
    </SiteLayout>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div className="absolute inset-0 bg-grain opacity-70" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-gain" /> 48 sociétés cotées · 100 % gratuit
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.02] sm:text-6xl lg:text-7xl">
            Ton solde n'est pas ta <span className="relative whitespace-nowrap"><span className="relative z-10">performance.</span><span className="absolute inset-x-0 bottom-1 -z-0 h-4 bg-primary/70 sm:h-5" aria-hidden="true" /></span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Ton appli SGI mélange l'argent que tu as versé et la valeur de tes actions. Kauri les sépare et te montre ce que tu gagnes
            vraiment — plus-values, dividendes et frais compris, en FCFA.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link to="/signup" search={{ ref: undefined }}>
                Voir ma vraie rentabilité <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <a href="#etapes">Comment ça marche</a>
            </Button>
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-1.5"><Lock className="h-4 w-4" /> Aucun accès bancaire</li>
            <li className="flex items-center gap-1.5"><Ban className="h-4 w-4" /> Pas de carte bancaire</li>
            <li className="flex items-center gap-1.5"><BadgeCheck className="h-4 w-4" /> Tes données restent tiennes</li>
          </ul>
        </div>
        <Comparison />
      </div>
    </section>
  );
}

function Comparison() {
  return (
    <div className="relative" aria-label="Comparaison entre le solde affiché par une SGI et la vraie performance">
      <div className="rounded-2xl border bg-card p-5 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ce que montre ton appli SGI</p>
        <p className="mt-2 font-display text-4xl font-semibold tabular">957 497 FCFA</p>
        <p className="mt-1 text-sm text-muted-foreground">Solde du compte — « ça a l'air bien »</p>
      </div>
      <div className="relative -mt-3 ml-6 rounded-2xl bg-ink p-6 text-ink-foreground shadow-lift sm:ml-12">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Ce que montre Kauri</p>
          <span className="rounded-full bg-loss-soft px-2 py-0.5 text-xs font-semibold text-loss tabular">−5,20 %</span>
        </div>
        <p className="mt-2 font-display text-4xl font-semibold text-loss tabular">−52 503 FCFA</p>
        <p className="mt-1 text-sm text-ink-muted">Gain net réel, frais compris</p>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-sidebar-border pt-4 text-sm">
          <div>
            <dt className="text-ink-muted">Apports nets</dt>
            <dd className="font-semibold tabular">1 010 000 FCFA</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Liquidité</dt>
            <dd className="font-semibold tabular">416 047 FCFA</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Valeur des titres</dt>
            <dd className="font-semibold tabular">541 450 FCFA</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Frais payés</dt>
            <dd className="font-semibold tabular">953 FCFA</dd>
          </div>
        </dl>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Exemple illustratif</p>
    </div>
  );
}

function Problem() {
  const items = [
    { t: "Le dépôt gonfle le solde", d: "Tu verses 100 000 FCFA : ton solde monte. Tu n'as rien gagné pour autant." },
    { t: "Les frais disparaissent", d: "Courtage, droits, IRVM sur dividendes : prélevés en silence, jamais additionnés." },
    { t: "Aucun point de comparaison", d: "As-tu fait mieux que le marché ? Ton appli ne te le dira pas." },
  ];
  return (
    <section id="probleme" className="scroll-mt-28 border-b">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Le problème</p>
        <h2 className="mt-2 max-w-2xl text-4xl font-bold">Le solde mélange tout. Tu ne sais pas si tu gagnes.</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((it, i) => (
            <div key={it.t} className="border-t-2 border-foreground pt-5">
              <span className="font-display text-sm font-semibold text-muted-foreground">0{i + 1}</span>
              <h3 className="mt-2 text-xl font-semibold">{it.t}</h3>
              <p className="mt-2 text-muted-foreground">{it.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MiniBars() {
  const rows = [
    { t: "SMBC", v: 82 },
    { t: "PRSC", v: 64 },
    { t: "BOABF", v: 51 },
    { t: "SLBC", v: -46 },
    { t: "FTSC", v: -38 },
  ];
  return (
    <div className="space-y-1.5" aria-hidden="true">
      {rows.map((r) => (
        <div key={r.t} className="flex items-center gap-2 text-[0.65rem] font-semibold">
          <span className="w-10">{r.t}</span>
          <div className="h-2.5 flex-1 rounded-full bg-muted">
            <div className={r.v > 0 ? "h-full rounded-full bg-gain" : "h-full rounded-full bg-loss"} style={{ width: `${Math.abs(r.v)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniLines() {
  return (
    <svg viewBox="0 0 200 80" className="h-20 w-full" aria-hidden="true">
      <polyline points="0,50 25,46 50,52 75,40 100,44 125,34 150,38 175,28 200,30" fill="none" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="4 3" />
      <polyline points="0,50 25,44 50,40 75,42 100,30 125,26 150,20 175,22 200,12" fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Solution() {
  const modules = [
    {
      icon: CircleDollarSign,
      t: "Vue d'ensemble",
      d: "Valeur totale, gain net, rendement annualisé. Apports, liquidité et capital investi enfin séparés.",
      art: (
        <div className="grid grid-cols-2 gap-2" aria-hidden="true">
          {["Valeur totale", "Gain total", "Apports", "Liquidité"].map((l, i) => (
            <div key={l} className="rounded-md border bg-background p-2">
              <div className="text-[0.6rem] uppercase text-muted-foreground">{l}</div>
              <div className={i === 1 ? "font-display text-sm font-semibold text-gain" : "font-display text-sm font-semibold"}>{["1,24 M", "+86 420", "1,15 M", "212 k"][i]}</div>
            </div>
          ))}
        </div>
      ),
    },
    { icon: LineChart, t: "Indice base 100", d: "Ton portefeuille contre le BRVM Composite, apports neutralisés. L'écart en points, sans débat.", art: <MiniLines /> },
    {
      icon: Upload,
      t: "Transactions et import",
      d: "Saisie en 30 secondes ou import de ton relevé SGI. Frais en FCFA et en %, export prêt pour l'IRVM.",
      art: (
        <div className="space-y-1.5 text-[0.65rem]" aria-hidden="true">
          {[["Acquisition", "SNTS 10 × 25 000", "Sortie"], ["Dividende", "ORAC net", "Entrée"], ["Dépôt", "Virement", "Entrée"]].map((r) => (
            <div key={r[1]} className="flex items-center justify-between rounded-md border bg-background px-2 py-1.5">
              <span className="font-semibold">{r[0]}</span>
              <span className="text-muted-foreground">{r[1]}</span>
              <span className={r[2] === "Entrée" ? "text-gain" : "text-loss"}>{r[2]}</span>
            </div>
          ))}
        </div>
      ),
    },
    { icon: Receipt, t: "Analyse de marché", d: "Palmarès du jour, volumes, dividendes à venir, fiches titres et screener sur les 48 valeurs.", art: <MiniBars /> },
  ];
  return (
    <section id="solution" className="scroll-mt-28 border-b bg-secondary/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">La solution</p>
        <h2 className="mt-2 max-w-2xl text-4xl font-bold">Quatre outils. Un seul chiffre qui compte : ce que tu gagnes.</h2>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {modules.map((m) => (
            <article key={m.t} className="flex flex-col justify-between gap-6 rounded-2xl border bg-card p-6 shadow-card">
              <div>
                <m.icon className="h-6 w-6 text-primary" />
                <h3 className="mt-3 text-xl font-semibold">{m.t}</h3>
                <p className="mt-1 text-muted-foreground">{m.d}</p>
              </div>
              <div className="rounded-xl bg-secondary p-4">{m.art}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    { t: "Crée ton compte", d: "Une adresse email suffit. Pas de carte bancaire, pas d'accès SGI." },
    { t: "Saisis tes opérations", d: "Dépôts, achats, ventes, dividendes — ou importe ton relevé CSV/Excel." },
    { t: "Lis ta vraie performance", d: "Gain net, rendement annualisé et comparaison au BRVM Composite, en moins de 3 minutes." },
  ];
  return (
    <section id="etapes" className="scroll-mt-28 border-b">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comment ça marche</p>
        <h2 className="mt-2 text-4xl font-bold">Trois étapes, trois minutes.</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.t} className="relative rounded-2xl border bg-card p-6 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">{i + 1}</span>
              <h3 className="mt-4 text-xl font-semibold">{s.t}</h3>
              <p className="mt-1 text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function FreeBand() {
  return (
    <section className="border-b bg-primary">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-12 text-primary-foreground sm:px-6">
        <div>
          <h2 className="text-3xl font-bold">100 % gratuit. Pour de vrai.</h2>
          <p className="mt-1 max-w-xl">Pas de plan Pro, pas de fonction verrouillée, pas d'abonnement. Toutes les fonctions sont ouvertes dès l'inscription.</p>
        </div>
        <Button asChild variant="ink" size="lg" className="h-12 px-6">
          <Link to="/signup" search={{ ref: undefined }}>Créer mon compte</Link>
        </Button>
      </div>
    </section>
  );
}

function Founder() {
  return (
    <section className="border-b">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[auto_1fr] md:items-center">
        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-ink font-display text-5xl font-bold text-primary">K</div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Un mot du fondateur</p>
          <blockquote className="mt-3 font-display text-2xl font-medium leading-snug sm:text-3xl">
            « J'investissais à la BRVM depuis des années et j'étais incapable de dire si je gagnais de l'argent. Mon solde montait — parce que
            je versais. Kauri, c'est l'outil que j'aurais voulu avoir : honnête, simple, et gratuit. »
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">— Le fondateur de Kauri, investisseur particulier à la BRVM</p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 border-b">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">FAQ</p>
        <h2 className="mt-2 text-4xl font-bold">Questions fréquentes</h2>
        <Accordion type="single" collapsible className="mt-8">
          {FAQ.map((f, i) => (
            <AccordionItem key={f.q} value={`q${i}`}>
              <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-grain">
      <div className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6">
        <h2 className="text-4xl font-extrabold sm:text-5xl">Arrête de deviner. Mesure.</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">Ta première transaction prend moins de trois minutes. Ta vraie performance s'affiche aussitôt.</p>
        <Button asChild size="lg" className="mt-8 h-12 px-8 text-base">
          <Link to="/signup" search={{ ref: undefined }}>
            Voir ma vraie rentabilité <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  );
}
