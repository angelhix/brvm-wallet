import { createFileRoute } from "@tanstack/react-router";
import { ComingSoon } from "@/components/app/coming-soon";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Back-office — Kauri" }, { name: "description", content: "Utilisateurs, messages et données de marché." }] }),
  component: () => <ComingSoon title="Back-office" description="Utilisateurs, messages et données de marché." />,
});
