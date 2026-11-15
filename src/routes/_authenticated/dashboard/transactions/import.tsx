import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/dashboard/transactions/import")({
  head: () => ({ meta: [{ title: "Importer un relevé — Kauri" }, { name: "description", content: "Import CSV ou Excel avec vérification." }] }),
  component: () => <ComingSoon title="Importer un relevé" description="Import CSV ou Excel avec vérification." />,
});
