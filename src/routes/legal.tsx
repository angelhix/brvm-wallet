import { createFileRoute } from "@tanstack/react-router";
import { ProsePage } from "@/components/site/site-layout";
import { DISCLAIMER } from "@/lib/constants";

export const Route = createFileRoute("/legal")({
  head: () => ({
    meta: [
      { title: "Mentions légales et conditions — Kauri" },
      { name: "description", content: "Éditeur, hébergeur, responsabilité et conditions d'utilisation du service Kauri." },
      { property: "og:title", content: "Mentions légales — Kauri" },
      { property: "og:description", content: "Éditeur, hébergeur et conditions d'utilisation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <ProsePage eyebrow="Légal" title="Mentions légales" intro="Informations sur l'éditeur, l'hébergeur et les conditions d'utilisation de Kauri.">
      <h2>Éditeur</h2>
      <p>Kauri — [raison sociale, forme juridique et adresse à compléter]. Directeur de la publication : [nom à compléter]. Contact : via la page Contact.</p>
      <h2>Hébergeur</h2>
      <p>L'application et sa base de données sont hébergées sur l'infrastructure cloud de Lovable, avec sauvegardes quotidiennes.</p>
      <h2>Nature du service</h2>
      <p>{DISCLAIMER}</p>
      <p>Les cours, indices et données financières sont fournis à titre informatif. Malgré nos efforts, ils peuvent comporter des erreurs ou des retards. Les calculs de performance dépendent des opérations que tu saisis.</p>
      <h2>Conditions d'utilisation</h2>
      <ul>
        <li>Le service est gratuit et réservé à un usage personnel.</li>
        <li>Tu es responsable de l'exactitude des opérations que tu saisis ou importes.</li>
        <li>Il est interdit d'automatiser l'accès au service ou de tenter d'accéder aux données d'autres utilisateurs.</li>
        <li>Des plafonds techniques anti-abus peuvent s'appliquer (nombre de portefeuilles, de transactions ou d'imports par jour).</li>
        <li>Tu peux supprimer ton compte à tout moment depuis les paramètres ; tes données sont alors effacées.</li>
      </ul>
      <h2>Responsabilité</h2>
      <p>Kauri ne passe aucun ordre et n'a accès à aucun compte-titres. Kauri ne saurait être tenu responsable des décisions d'investissement prises sur la base des informations affichées.</p>
    </ProsePage>
  ),
});
