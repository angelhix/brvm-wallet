import { useQuery } from "@tanstack/react-query";
import { marketLatestQuery } from "@/lib/market";
import { fmtNum, fmtPct, toneOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TickerTape({ className }: { className?: string }) {
  const { data } = useQuery(marketLatestQuery);
  const rows = data ?? [];
  if (rows.length === 0) {
    return <div className={cn("h-9 border-b border-sidebar-border bg-ink", className)} aria-hidden="true" />;
  }
  const items = [...rows, ...rows];
  return (
    <div className={cn("overflow-hidden border-b border-sidebar-border bg-ink text-ink-foreground", className)} aria-label="Cours de clôture des titres de la BRVM">
      <div className="animate-ticker flex w-max gap-8 py-2 text-xs">
        {items.map((r, i) => {
          const t = toneOf(r.change);
          return (
            <span key={`${r.ticker}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap tabular" aria-hidden={i >= rows.length}>
              <span className="font-semibold tracking-wide">{r.ticker}</span>
              <span className="text-ink-muted">{fmtNum(r.close)}</span>
              <span className={cn(t === "gain" && "text-gain", t === "loss" && "text-loss", t === "flat" && "text-ink-muted")}>
                {fmtPct(r.change, { signed: true })}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
