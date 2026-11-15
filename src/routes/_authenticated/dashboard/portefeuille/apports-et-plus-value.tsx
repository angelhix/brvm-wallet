import { createFileRoute } from "@tanstack/react-router";
import { PerformanceScreen } from "@/components/app/performance";

export const Route = createFileRoute("/_authenticated/dashboard/portefeuille/apports-et-plus-value")({
  head: () => ({ meta: [{ title: "Apports et plus-value — Kauri" }, { name: "description", content: "Apports et plus-value de ton portefeuille BRVM, jour par jour ou mois par mois." }] }),
  component: () => <PerformanceScreen view="apports" />,
});
