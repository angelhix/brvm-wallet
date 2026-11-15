import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { fmtFCFA, fmtPct, toneOf } from "@/lib/format";

export function Tone({ value, children, className }: { value: number | null | undefined; children: ReactNode; className?: string | undefined }) {
  const t = toneOf(value);
  return <span className={cn("tabular", t === "gain" && "text-gain", t === "loss" && "text-loss", className)}>{children}</span>;
}

export function Money({ value, signed, tone, className }: { value: number | null | undefined; signed?: boolean | undefined; tone?: boolean | undefined; className?: string | undefined }) {
  const txt = fmtFCFA(value, { signed });
  return tone ? <Tone value={value} className={className}>{txt}</Tone> : <span className={cn("tabular", className)}>{txt}</span>;
}

export function Pct({ value, signed = true, tone = true, className }: { value: number | null | undefined; signed?: boolean | undefined; tone?: boolean | undefined; className?: string | undefined }) {
  const txt = fmtPct(value, { signed });
  return tone ? <Tone value={value} className={className}>{txt}</Tone> : <span className={cn("tabular", className)}>{txt}</span>;
}

export function DeltaBadge({ value, className }: { value: number | null | undefined; className?: string }) {
  const t = toneOf(value);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular",
        t === "gain" && "bg-gain-soft text-gain",
        t === "loss" && "bg-loss-soft text-loss",
        t === "flat" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {fmtPct(value, { signed: true })}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  emphasis,
  className,
  children,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  emphasis?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-card sm:p-5", emphasis && "border-transparent bg-ink text-ink-foreground", className)}>
      <div className={cn("flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-wider", emphasis ? "text-ink-muted" : "text-muted-foreground")}>
        <span>{label}</span>
        {icon}
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular sm:text-[1.7rem]">{value}</div>
      {sub && <div className={cn("mt-1 text-sm", emphasis ? "text-ink-muted" : "text-muted-foreground")}>{sub}</div>}
      {children}
    </div>
  );
}

export function Section({ title, description, actions, children, className, ...rest }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("rounded-xl border bg-card p-4 shadow-card sm:p-5", className)} {...rest}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function KeyValue({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed py-2 last:border-0">
      <span className="text-sm text-muted-foreground">
        {label}
        {hint && <span className="block text-xs">{hint}</span>}
      </span>
      <span className="text-right font-medium tabular">{value}</span>
    </div>
  );
}
