import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
  className?: string;
}

/** Plain responsive table used across the app screens. */
export function DataTable<T>({ rows, columns, rowKey, footer, empty = "Aucune donnée.", onRowClick }: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  footer?: ReactNode;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
}) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wider text-muted-foreground">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-3 py-2 font-medium", c.align === "right" ? "text-right" : "text-left", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr
              key={rowKey(r)}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cn("border-b last:border-0", onRowClick && "cursor-pointer hover:bg-secondary/60")}
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-2.5 tabular", c.align === "right" ? "text-right" : "text-left", c.className)}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot className="border-t-2 font-semibold">{footer}</tfoot>}
      </table>
    </div>
  );
}
