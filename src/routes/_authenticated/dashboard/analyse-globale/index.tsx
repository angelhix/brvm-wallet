import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/dashboard/analyse-globale/")({
  head: () => ({ meta: [{ title: "Analyse globale — Kauri" }, { name: "description", content: "Palmarès, résiduelles, volumes et dividendes." }] }),
  component: () => <ComingSoon title="Analyse globale" description="Palmarès, résiduelles, volumes et dividendes." />,
});
