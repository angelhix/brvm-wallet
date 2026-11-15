// Browser-only export helpers (CSV, Excel, PDF). Libraries are loaded on demand.
export type Cell = string | number | null;

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(filename: string, headers: string[], rows: Cell[][]) {
  const esc = (v: Cell) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = [headers, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  download(new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8" }), filename);
}

export async function exportXlsx(filename: string, sheet: string, headers: string[], rows: Cell[][]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
  XLSX.writeFile(wb, filename);
}

export async function exportPdf(filename: string, title: string, subtitle: string, headers: string[], rows: Cell[][]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: headers.length > 6 ? "landscape" : "portrait" });
  doc.setFontSize(16);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.text(subtitle, 14, 22);
  // jsPDF's core fonts lack U+202F / U+2212: swap them for plain equivalents.
  const clean = (v: Cell) => (v == null ? "" : String(v).replace(/\u202F/g, " ").replace(/\u2212/g, "-"));
  autoTable(doc, {
    startY: 27,
    head: [headers.map(clean)],
    body: rows.map((r) => r.map(clean)),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 34, 28] },
  });
  doc.setFontSize(7);
  doc.text("Kauri — service indépendant, sans lien avec la BRVM.", 14, doc.internal.pageSize.getHeight() - 8);
  doc.save(filename);
}

/** Parse a CSV or Excel file into rows of strings (first row = headers). */
export async function readSheet(file: File): Promise<string[][]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array", cellDates: true, raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]!]!;
  return XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "", dateNF: "yyyy-mm-dd" }).map((r) => r.map((c) => String(c ?? "").trim()));
}
