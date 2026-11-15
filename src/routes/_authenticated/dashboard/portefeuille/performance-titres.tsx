import { createFileRoute } from "@tanstack/react-router";
import { PerformanceScreen } from "@/components/app/performance";

export const Route = createFileRoute("/_authenticated/dashboard/portefeuille/performance-titres")({
  head: () => ({ meta: [{ title: "Performance par titre — Kauri" }, { name: "description", content: "Performance par titre de ton portefeuille BRVM, jour par jour ou mois par mois." }] }),
  component: () => <PerformanceScreen view="titres" />,
});
