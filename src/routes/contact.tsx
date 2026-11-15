import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout } from "@/components/site/site-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Kauri" },
      { name: "description", content: "Une question, une suggestion ou un problème ? Écris à l'équipe Kauri." },
      { property: "og:title", content: "Contact — Kauri" },
      { property: "og:description", content: "Écris à l'équipe Kauri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ContactPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Indique ton nom").max(120),
  email: z.string().trim().email("Email invalide").max(255),
  subject: z.string().trim().min(1, "Indique un sujet").max(200),
  message: z.string().trim().min(10, "Ton message est un peu court").max(5000),
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Formulaire incomplet");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("contact_messages").insert(parsed.data);
    setBusy(false);
    if (error) {
      toast.error("Envoi impossible pour le moment. Réessaie.");
      return;
    }
    setDone(true);
  }

  return (
    <SiteLayout>
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Contact</p>
          <h1 className="mt-2 text-5xl font-bold">Parlons-en.</h1>
          <p className="mt-4 text-lg text-muted-foreground">Question, bug, idée de fonction ? On lit tous les messages et on répond par email.</p>
          <p className="mt-8 text-sm text-muted-foreground">Ne nous envoie jamais d'identifiant bancaire ou SGI : nous ne te les demanderons jamais.</p>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-card sm:p-8">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-gain" />
              <h2 className="mt-4 text-2xl font-semibold">Message envoyé</h2>
              <p className="mt-2 text-muted-foreground">Merci ! Nous te répondrons à {form.email}.</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nom</Label>
                  <Input id="name" value={form.name} onChange={set("name")} maxLength={120} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={form.email} onChange={set("email")} maxLength={255} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Sujet</Label>
                <Input id="subject" value={form.subject} onChange={set("subject")} maxLength={200} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea id="message" rows={6} value={form.message} onChange={set("message")} maxLength={5000} required />
              </div>
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                {busy ? "Envoi…" : "Envoyer"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
