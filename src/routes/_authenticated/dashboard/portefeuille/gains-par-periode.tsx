import { createFileRoute } from "@tanstack/react-router";
import { PerformanceScreen } from "@/components/app/performance";

export const Route = createFileRoute("/_authenticated/dashboard/portefeuille/gains-par-periode")({
  head: () => ({ meta: [{ title: "Gains par période — Kauri" }, { name: "description", content: "Gains par période de ton portefeuille BRVM, jour par jour ou mois par mois." }] }),
  component: () => <PerformanceScreen view="portefeuille" />,
});
