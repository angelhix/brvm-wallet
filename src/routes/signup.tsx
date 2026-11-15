import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { db as supabase } from "@/lib/local-db";
import { useAuth } from "@/hooks/use-auth";
import { AuthShell, OrDivider, SocialButtons } from "@/components/site/auth-card";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>): { ref?: string | undefined } => ({
    ref: typeof s["ref"] === "string" ? (s["ref"] as string).slice(0, 16) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Inscription gratuite — Kauri" },
      { name: "description", content: "Crée ton compte Kauri gratuitement et découvre ta vraie rentabilité à la BRVM. Sans carte bancaire." },
      { property: "og:title", content: "Inscription gratuite — Kauri" },
      { property: "og:description", content: "Ta vraie rentabilité BRVM en moins de 3 minutes. Gratuit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { ref } = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (ref) window.localStorage.setItem("kauri.ref", ref);
  }, [ref]);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [user, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error("Accepte les conditions pour continuer.");
      return;
    }
    if (password.length < 8) {
      toast.error("Ton mot de passe doit faire au moins 8 caractères.");
      return;
    }
    setBusy(true);
    const refCode = ref ?? window.localStorage.getItem("kauri.ref") ?? undefined;
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { first_name: firstName.trim() || undefined, ref: refCode },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message.includes("registered") ? "Un compte existe déjà avec cet email." : error.message);
      return;
    }
    if (data.session) navigate({ to: "/dashboard", replace: true });
    else setSent(true);
  }

  if (sent) {
    return (
      <AuthShell title="Vérifie ta boîte mail" subtitle={`Un lien de confirmation vient d'être envoyé à ${email}.`}>
        <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
          <MailCheck className="h-5 w-5 shrink-0 text-gain" />
          <p className="text-muted-foreground">Clique sur le lien pour activer ton compte. Pense à regarder dans les spams.</p>
        </div>
        <Button asChild variant="outline" className="mt-6 w-full">
          <Link to="/login" search={{ redirect: undefined }}>Aller à la connexion</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Crée ton compte"
      subtitle="Gratuit, sans carte bancaire, sans accès à ton compte SGI."
      footer={
        <>
          Déjà inscrit ?{" "}
          <Link to="/login" search={{ redirect: undefined }} className="font-semibold text-foreground underline underline-offset-4">
            Connecte-toi
          </Link>
        </>
      }
    >
      {ref && <p className="mb-4 rounded-lg bg-gold-soft px-3 py-2 text-sm">Tu as été invité par un ami (code {ref.toUpperCase()}).</p>}
      <SocialButtons redirectTo="/dashboard" onDone={() => navigate({ to: "/dashboard", replace: true })} />
      <OrDivider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="first">Prénom <span className="text-muted-foreground">(facultatif)</span></Label>
          <Input id="first" autoComplete="given-name" value={firstName} maxLength={60} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Mot de passe</Label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">8 caractères minimum.</p>
        </div>
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={accepted} onCheckedChange={(v) => setAccepted(v === true)} className="mt-0.5" aria-label="Accepter les conditions" />
          <span className="text-muted-foreground">
            J'accepte les <Link to="/legal" className="underline">conditions d'utilisation</Link> et la{" "}
            <Link to="/privacy" className="underline">politique de confidentialité</Link>.
          </span>
        </label>
        <Button type="submit" className="w-full" size="lg" disabled={busy}>
          {busy ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
    </AuthShell>
  );
}
