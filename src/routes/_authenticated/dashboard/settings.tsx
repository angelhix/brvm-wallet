import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({ meta: [{ title: "Paramètres — Kauri" }, { name: "description", content: "Profil, portefeuille et visites guidées." }] }),
  component: () => <ComingSoon title="Paramètres" description="Profil, portefeuille et visites guidées." />,
});
