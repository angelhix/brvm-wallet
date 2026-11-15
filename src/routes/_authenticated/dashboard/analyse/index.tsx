import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/dashboard/analyse/")({
  head: () => ({ meta: [{ title: "Fiche titre — Kauri" }, { name: "description", content: "Fondamentaux et ratios d'un titre." }] }),
  component: () => <ComingSoon title="Fiche titre" description="Fondamentaux et ratios d'un titre." />,
});
