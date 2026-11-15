import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, CalendarClock, Clock, MessageCircle, Phone, Video, X } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Section } from "@/components/app/kpi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/local-db";
import { fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/rendez-vous")({
  head: () => ({
    meta: [
      { title: "Rendez-vous — Kauri" },
      { name: "description", content: "Réserve gratuitement un échange de 30 minutes pour prendre en main Kauri ou comprendre ta performance." },
    ],
  }),
  component: RendezVous,
});

export const SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"];
const TOPICS = ["Prise en main", "Import d'un relevé", "Lecture de la performance", "Dividendes et IRVM", "Autre question"];
const CHANNELS = [
  { value: "visio", label: "Visio", icon: Video },
  { value: "telephone", label: "Téléphone", icon: Phone },
  { value: "whatsapp", label: "WhatsApp", icon: MessageCircle },
] as const;
const DAY_NAMES = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** The next `n` weekdays after `from` (ISO dates). */
export function nextWeekdays(from: Date, n: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (out.length < n) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

interface Appointment {
  id: string;
  date: string;
  slot: string;
  topic: string;
  note: string | null;
  channel?: string;
  phone?: string | null;
  status: string;
  created_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  demandé: "bg-gold-soft text-foreground",
  confirmé: "bg-gain-soft text-gain",
  terminé: "bg-muted text-muted-foreground",
  annulé: "bg-loss-soft text-loss",
};

function RendezVous() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const days = useMemo(() => nextWeekdays(new Date(), 10), []);
  const [date, setDate] = useState(days[0]!);
  const [slot, setSlot] = useState<string | null>(null);
  const [topic, setTopic] = useState(TOPICS[0]!);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]["value"]>("visio");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const taken = useQuery({
    queryKey: ["taken-slots", days[0], days[days.length - 1]],
    queryFn: async () => {
      const { data, error } = await db.rpc("taken_slots", { p_from: days[0], p_to: days[days.length - 1] });
      if (error) throw error;
      return new Set<string>((data ?? []).map((r: { date: string; slot: string }) => `${r.date} ${r.slot}`));
    },
  });
  const mine = useQuery({
    queryKey: ["appointments", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Appointment[]> => {
      const { data, error } = await db.from("appointments").select("*").eq("user_id", user!.id).order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = (mine.data ?? []).filter((a) => a.date >= today && a.status !== "annulé" && a.status !== "terminé");
  const past = (mine.data ?? []).filter((a) => !upcoming.includes(a));
  const freeCount = (d: string) => SLOTS.filter((s) => !taken.data?.has(`${d} ${s}`)).length;

  async function book(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) {
      toast.error("Choisis un créneau.");
      return;
    }
    if (channel !== "visio" && !/^[+\d][\d\s]{7,}$/.test(phone.trim())) {
      toast.error("Indique un numéro de téléphone valide.");
      return;
    }
    if (upcoming.length >= 2) {
      toast.error("Tu as déjà deux rendez-vous à venir. Annule-en un pour réserver.");
      return;
    }
    setBusy(true);
    const { error } = await db.from("appointments").insert({
      date,
      slot,
      topic,
      channel,
      phone: channel === "visio" ? null : phone.trim(),
      note: note.trim().slice(0, 500) || null,
      status: "demandé",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["taken-slots"] });
      return;
    }
    toast.success(`Rendez-vous demandé le ${fmtDate(date)} à ${slot}. Tu recevras une confirmation par email.`);
    setSlot(null);
    setNote("");
    qc.invalidateQueries({ queryKey: ["taken-slots"] });
    qc.invalidateQueries({ queryKey: ["appointments", user?.id] });
  }

  async function cancel(a: Appointment) {
    if (!confirm(`Annuler le rendez-vous du ${fmtDate(a.date)} à ${a.slot} ?`)) return;
    const { error } = await db.from("appointments").update({ status: "annulé" }).eq("id", a.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rendez-vous annulé.");
    qc.invalidateQueries({ queryKey: ["taken-slots"] });
    qc.invalidateQueries({ queryKey: ["appointments", user?.id] });
  }

  return (
    <>
      <PageHeader
        title="Rendez-vous"
        description="Un échange de 30 minutes, gratuit, avec l'équipe Kauri : prise en main, import de ton relevé ou lecture de ta performance."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <form onSubmit={book} className="space-y-4 lg:col-span-2">
          <Section title="1. Choisis un jour" description="Heure d'Abidjan et de Dakar (GMT), du lundi au vendredi.">
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {days.map((d) => {
                const dt = new Date(d + "T00:00:00Z");
                const free = freeCount(d);
                return (
                  <button
                    type="button"
                    key={d}
                    onClick={() => {
                      setDate(d);
                      setSlot(null);
                    }}
                    aria-pressed={date === d}
                    className={cn(
                      "flex min-w-[78px] flex-col items-center rounded-xl border px-3 py-2.5 transition-colors",
                      date === d ? "border-transparent bg-ink text-ink-foreground" : "bg-card hover:border-primary",
                    )}
                  >
                    <span className={cn("text-xs", date === d ? "text-ink-muted" : "text-muted-foreground")}>{DAY_NAMES[dt.getUTCDay()]}</span>
                    <span className="font-display text-xl font-semibold">{dt.getUTCDate()}</span>
                    <span className={cn("text-xs", date === d ? "text-ink-muted" : "text-muted-foreground")}>{MONTHS[dt.getUTCMonth()]}</span>
                    <span className={cn("mt-1 text-[0.65rem] font-semibold", free === 0 ? "text-loss" : date === d ? "text-primary" : "text-gain")}>
                      {free === 0 ? "Complet" : `${free} libres`}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="2. Choisis un créneau de 30 minutes">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-7">
              {SLOTS.map((s) => {
                const busySlot = taken.data?.has(`${date} ${s}`);
                return (
                  <button
                    type="button"
                    key={s}
                    disabled={busySlot}
                    onClick={() => setSlot(s)}
                    aria-pressed={slot === s}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-semibold tabular transition-colors",
                      busySlot && "cursor-not-allowed bg-muted text-muted-foreground line-through",
                      !busySlot && slot === s && "border-transparent bg-primary text-primary-foreground",
                      !busySlot && slot !== s && "bg-card hover:border-primary",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="3. Dis-nous en plus">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="topic">Sujet</Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger id="topic"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <span className="text-sm font-medium">Comment veux-tu échanger ?</span>
                <div className="grid grid-cols-3 gap-2">
                  {CHANNELS.map((c) => (
                    <button
                      type="button"
                      key={c.value}
                      onClick={() => setChannel(c.value)}
                      aria-pressed={channel === c.value}
                      className={cn("flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm", channel === c.value ? "border-primary bg-gold-soft font-semibold" : "bg-card")}
                    >
                      <c.icon className="h-4 w-4" /> {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {channel !== "visio" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="phone">Numéro de téléphone</Label>
                  <Input id="phone" type="tel" inputMode="tel" placeholder="+225 07 00 00 00 00" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="note">Ta question (facultatif)</Label>
                <Textarea id="note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex. Je n'arrive pas à importer le relevé Excel de ma SGI." />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
              <p className="text-sm">
                {slot ? (
                  <span className="inline-flex items-center gap-2"><CalendarClock className="h-4 w-4" /> <strong>{fmtDate(date)}</strong> à <strong>{slot}</strong> · 30 min · {CHANNELS.find((c) => c.value === channel)?.label}</span>
                ) : (
                  <span className="text-muted-foreground">Choisis un créneau pour continuer.</span>
                )}
              </p>
              <Button type="submit" disabled={busy || !slot}><CalendarCheck /> {busy ? "Réservation…" : "Réserver"}</Button>
            </div>
          </Section>
        </form>

        <div className="space-y-4">
          <Section title="Tes rendez-vous à venir">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rendez-vous prévu.</p>
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{fmtDate(a.date)} · {a.slot}</p>
                        <p className="text-sm text-muted-foreground">{a.topic}</p>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[a.status])}>{a.status}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 -ml-2" onClick={() => cancel(a)}><X /> Annuler</Button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Comment ça se passe">
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <li className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> 30 minutes, gratuit, sans engagement.</li>
              <li className="flex gap-2"><CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Confirmation par email sous 24 h ouvrées, avec le lien ou l'appel prévu.</li>
              <li className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> Aucun conseil d'achat ou de vente : on t'aide à lire tes chiffres.</li>
            </ul>
          </Section>
          {past.length > 0 && (
            <Section title="Historique">
              <ul className="space-y-2 text-sm">
                {past.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2">
                    <span>{fmtDate(a.date)} · {a.topic}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", STATUS_STYLE[a.status])}>{a.status}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
