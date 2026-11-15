import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db as supabase } from "@/lib/local-db";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell, OrDivider, safeRedirect, SocialButtons } from "@/components/site/auth-card";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): { redirect?: string | undefined } => ({
    redirect: typeof s["redirect"] === "string" ? (s["redirect"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Connexion — Kauri" },
      { name: "description", content: "Connecte-toi à Kauri pour suivre la vraie performance de ton portefeuille BRVM." },
      { property: "og:title", content: "Connexion — Kauri" },
      { property: "og:description", content: "Accède à ton tableau de bord BRVM." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeRedirect(redirect);

  useEffect(() => {
    if (!loading && user) navigate({ to: target, replace: true });
  }, [user, loading, navigate, target]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("Email not confirmed") ? "Confirme d'abord ton adresse email (lien reçu à l'inscription)." : "Email ou mot de passe incorrect.");
      return;
    }
    navigate({ to: target, replace: true });
  }

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Connecte-toi pour voir ta vraie performance."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link to="/signup" search={{ ref: undefined }} className="font-semibold text-foreground underline underline-offset-4">
            Inscris-toi gratuitement
          </Link>
        </>
      }
    >
      <SocialButtons redirectTo={target} onDone={() => navigate({ to: target, replace: true })} />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4">
              Mot de passe oublié ?
            </Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </Button>
      </form>
    </AuthShell>
  );
}
