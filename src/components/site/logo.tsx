import { cn } from "@/lib/utils";

/** Cowrie-shell mark: the kauri was West Africa's first currency. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("h-7 w-7", className)}>
      <rect x="5" y="2" width="22" height="28" rx="11" className="fill-primary" />
      <path d="M16 6.5c-2.2 3.2-2.2 15.8 0 19 2.2-3.2 2.2-15.8 0-19Z" className="fill-ink" />
      <g className="stroke-ink" strokeWidth="1.4" strokeLinecap="round">
        <path d="M13.2 10.5h1.6M13 14h1.8M13 17.5h1.8M13.2 21h1.6M17.2 10.5h1.6M17.2 14h1.8M17.2 17.5h1.8M17.2 21h1.6" />
      </g>
    </svg>
  );
}

export function Logo({ className, tone = "default" }: { className?: string; tone?: "default" | "light" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className={cn("font-display text-xl font-bold tracking-tight", tone === "light" ? "text-ink-foreground" : "text-foreground")}>
        kauri
      </span>
    </span>
  );
}
