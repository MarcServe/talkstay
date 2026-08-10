import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  exportTalkStayReport,
  type ExportFormat,
  type TalkStayExportPayload,
} from "@/talkstay/lib/exportReport";

/** Shared CSV / PDF export control for Operations and Insights. */
export default function ExportReportButton({
  buildPayload,
  disabled,
  label = "Export",
}: {
  /** Build the full report at click-time so filters/range stay current. */
  buildPayload: () => TalkStayExportPayload | null;
  disabled?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);

  const run = async (format: ExportFormat) => {
    const payload = buildPayload();
    if (!payload) {
      toast.error("Nothing to export for this range.");
      return;
    }
    const rowCount = payload.tables.reduce((n, t) => n + t.rows.length, 0);
    if (!rowCount && !payload.metrics?.length) {
      toast.error("Nothing to export for this range.");
      return;
    }
    setBusy(true);
    try {
      await exportTalkStayReport(payload, format);
      toast.success(
        format === "csv"
          ? `Saved CSV · ${rowCount} detail rows`
          : `Saved PDF · ${rowCount} detail rows`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || busy}>
          {busy
            ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            : <Download className="mr-1.5 h-3.5 w-3.5" />}
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Export full report</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={busy} onClick={() => void run("csv")}>
          <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-600" />
          <div>
            <div className="font-medium">CSV</div>
            <div className="text-xs text-muted-foreground">Spreadsheets · Excel / Sheets</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy} onClick={() => void run("pdf")}>
          <FileText className="mr-2 h-4 w-4 text-rose-600" />
          <div>
            <div className="font-medium">PDF</div>
            <div className="text-xs text-muted-foreground">Printable summary + tables</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
