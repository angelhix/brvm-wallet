import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db as supabase } from "@/lib/local-db";
import { AuthShell } from "@/components/site/auth-card";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Kauri" },
      { name: "description", content: "Choisis un nouveau mot de passe pour ton compte Kauri." },
      { property: "og:title", content: "Nouveau mot de passe — Kauri" },
      { property: "og:description", content: "Choisis un nouveau mot de passe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("8 caractères minimum.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Le lien a expiré ou n'est plus valide. Redemande un lien.");
      return;
    }
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/dashboard", replace: true });
  }
  return (
    <AuthShell title="Nouveau mot de passe" subtitle="Choisis un mot de passe d'au moins 8 caractères.">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          Enregistrer
        </Button>
      </form>
    </AuthShell>
  );
}
