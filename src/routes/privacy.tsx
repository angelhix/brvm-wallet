import { createFileRoute } from "@tanstack/react-router";
import { ProsePage } from "@/components/site/site-layout";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Politique de confidentialité — Kauri" },
      { name: "description", content: "Données collectées par Kauri, finalités, durée de conservation et tes droits d'accès, de rectification et de suppression." },
      { property: "og:title", content: "Confidentialité — Kauri" },
      { property: "og:description", content: "Données collectées, durée et droits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProsePage eyebrow="Légal" title="Confidentialité" intro="Tes données servent à une seule chose : calculer ta performance. Elles ne sont jamais revendues.">
      <h2>Données collectées</h2>
      <ul>
        <li>Compte : adresse email, prénom (facultatif), mot de passe haché.</li>
        <li>Portefeuille : opérations que tu saisis ou importes (dates, titres, quantités, prix, frais, notes).</li>
        <li>Usage : visites guidées vues, demandes de rendez-vous, messages de contact.</li>
        <li>Aucune donnée bancaire, aucun identifiant SGI, aucune donnée de paiement.</li>
      </ul>
      <h2>Finalités</h2>
      <p>Fournir le service (calcul de performance, tableaux de bord, exports), répondre à tes demandes et assurer la sécurité de la plateforme.</p>
      <h2>Durée de conservation</h2>
      <p>Tes données sont conservées tant que ton compte est actif. Les fichiers de relevés importés sont analysés dans ton navigateur et ne sont pas conservés. À la suppression du compte, tes données sont effacées.</p>
      <h2>Tes droits</h2>
      <ul>
        <li>Accès et portabilité : export complet (CSV, Excel, PDF, JSON) depuis les paramètres.</li>
        <li>Rectification : modifie ton prénom, ton email et tes opérations à tout moment.</li>
        <li>Suppression : supprime ton compte en libre-service depuis les paramètres.</li>
      </ul>
      <p>Pour toute demande, utilise la page Contact. Le traitement respecte la loi ivoirienne relative à la protection des données à caractère personnel (autorité de contrôle : ARTCI) et le cadre du pays d'exploitation.</p>
    </ProsePage>
  ),
});
