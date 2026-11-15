import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db as supabase } from "@/lib/local-db";
import { AuthShell } from "@/components/site/auth-card";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Mot de passe oublié — Kauri" },
      { name: "description", content: "Reçois un lien pour réinitialiser ton mot de passe Kauri." },
      { property: "og:title", content: "Mot de passe oublié — Kauri" },
      { property: "og:description", content: "Réinitialise ton mot de passe Kauri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  }
  return (
    <AuthShell
      title="Mot de passe oublié"
      subtitle={sent ? "Si un compte existe pour cet email, un lien de réinitialisation vient d'être envoyé." : "Indique ton email, on t'envoie un lien."}
      footer={
        <Link to="/login" search={{ redirect: undefined }} className="underline underline-offset-4">
          Retour à la connexion
        </Link>
      }
    >
      {!sent && (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={busy}>
            Envoyer le lien
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
