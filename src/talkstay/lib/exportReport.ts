/**
 * TalkStay dashboard exports — CSV (spreadsheet) and PDF (printable report).
 * PDF libs are loaded on demand so the ops shell stays light until export.
 */

export type ExportFormat = "csv" | "pdf";

export interface ExportMetric {
  label: string;
  value: string | number;
}

export interface ExportTable {
  title: string;
  /** Column header → cell value. Order follows Object.keys of the first row. */
  rows: Record<string, string | number | null | undefined>[];
}

export interface TalkStayExportPayload {
  propertyName: string;
  title: string;
  subtitle?: string;
  rangeLabel: string;
  metrics?: ExportMetric[];
  tables: ExportTable[];
  filenameBase: string;
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function slugPart(s: string): string {
  return (s || "property").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-").toLowerCase().slice(0, 48);
}

function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.visibility = "hidden";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Build a multi-section CSV: summary metrics + every table. */
export function buildTalkStayCsv(payload: TalkStayExportPayload): string {
  const lines: string[] = [
    "TalkStay export",
    csvEscape(payload.propertyName),
    csvEscape(payload.title),
    `Range,${csvEscape(payload.rangeLabel)}`,
    `Generated,${csvEscape(new Date().toLocaleString())}`,
    "",
  ];

  if (payload.metrics?.length) {
    lines.push("Summary");
    lines.push("Metric,Value");
    for (const m of payload.metrics) {
      lines.push(`${csvEscape(m.label)},${csvEscape(m.value)}`);
    }
    lines.push("");
  }

  for (const table of payload.tables) {
    if (!table.rows.length) continue;
    lines.push(table.title);
    const headers = Object.keys(table.rows[0]);
    lines.push(headers.map(csvEscape).join(","));
    for (const row of table.rows) {
      lines.push(headers.map((h) => csvEscape(row[h])).join(","));
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function downloadTalkStayCsv(payload: TalkStayExportPayload) {
  const body = buildTalkStayCsv(payload);
  const blob = new Blob(["\uFEFF" + body], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${payload.filenameBase}_${stamp()}.csv`);
}

/** Clean print style: white page, black type, light grey rules — no brand fills. */
const PDF_TABLE = {
  styles: {
    fontSize: 8,
    cellPadding: 4,
    textColor: [20, 20, 20] as [number, number, number],
    fillColor: [255, 255, 255] as [number, number, number],
    lineColor: [210, 210, 210] as [number, number, number],
    lineWidth: 0.4,
    overflow: "linebreak" as const,
  },
  headStyles: {
    fillColor: [255, 255, 255] as [number, number, number],
    textColor: [0, 0, 0] as [number, number, number],
    fontStyle: "bold" as const,
    lineColor: [180, 180, 180] as [number, number, number],
    lineWidth: 0.6,
  },
  alternateRowStyles: {
    fillColor: [255, 255, 255] as [number, number, number],
  },
  theme: "plain" as const,
};

export async function downloadTalkStayPdf(payload: TalkStayExportPayload) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const paintWhitePage = () => {
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setTextColor(0, 0, 0);
  };
  paintWhitePage();
  // Ensure auto-added pages stay white (jsPDF default is already white; keep explicit).
  const ensureWhite = { didDrawPage: () => { doc.setTextColor(0, 0, 0); } };

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("TalkStay", margin, y);
  y += 18;

  doc.setFontSize(12);
  doc.text(payload.title, margin, y);
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const meta = [
    payload.propertyName,
    payload.subtitle,
    `Range: ${payload.rangeLabel}`,
    `Generated: ${new Date().toLocaleString()}`,
  ].filter(Boolean) as string[];
  for (const line of meta) {
    doc.text(line, margin, y);
    y += 12;
  }

  // Subtle rule under the header — not a coloured band.
  y += 4;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 14;
  doc.setTextColor(0, 0, 0);

  const afterTableY = () =>
    ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y) + 18;

  if (payload.metrics?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Summary", margin, y);
    y += 8;
    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: payload.metrics.map((m) => [String(m.label), String(m.value)]),
      margin: { left: margin, right: margin },
      ...PDF_TABLE,
      styles: { ...PDF_TABLE.styles, fontSize: 9 },
      ...ensureWhite,
    });
    y = afterTableY();
  }

  for (const table of payload.tables) {
    if (!table.rows.length) continue;
    if (y > 500) {
      doc.addPage();
      paintWhitePage();
      y = margin;
    }
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(table.title, margin, y);
    y += 8;

    const headers = Object.keys(table.rows[0]);
    autoTable(doc, {
      startY: y,
      head: [headers],
      body: table.rows.map((row) => headers.map((h) => String(row[h] ?? ""))),
      margin: { left: margin, right: margin },
      ...PDF_TABLE,
      ...ensureWhite,
    });
    y = afterTableY();
  }

  if (!payload.metrics?.length && payload.tables.every((t) => !t.rows.length)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    doc.text("No rows in this range.", margin, y);
  }

  doc.save(`${payload.filenameBase}_${stamp()}.pdf`);
}

export async function exportTalkStayReport(payload: TalkStayExportPayload, format: ExportFormat) {
  if (format === "csv") downloadTalkStayCsv(payload);
  else await downloadTalkStayPdf(payload);
}

export function exportFilenameBase(hotelSlugOrName: string, kind: string, range: string): string {
  return `talkstay-${slugPart(hotelSlugOrName)}-${kind}-${range}`;
}
