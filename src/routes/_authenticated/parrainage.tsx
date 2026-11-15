import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/parrainage")({
  head: () => ({ meta: [{ title: "Parrainage — Kauri" }, { name: "description", content: "Ton lien et tes filleuls." }] }),
  component: () => <ComingSoon title="Parrainage" description="Ton lien et tes filleuls." />,
});
