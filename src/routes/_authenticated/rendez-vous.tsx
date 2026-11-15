import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/rendez-vous")({
  head: () => ({ meta: [{ title: "Rendez-vous — Kauri" }, { name: "description", content: "Réserve un échange de 30 minutes." }] }),
  component: () => <ComingSoon title="Rendez-vous" description="Réserve un échange de 30 minutes." />,
});
