import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/dashboard/analyse/screener")({
  head: () => ({ meta: [{ title: "Screener — Kauri" }, { name: "description", content: "Filtre les 48 titres par critères." }] }),
  component: () => <ComingSoon title="Screener" description="Filtre les 48 titres par critères." />,
});
