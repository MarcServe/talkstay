import { Mail, QrCode } from "lucide-react";
import { GUEST_ACCESS_HEADLINE, GUEST_ACCESS_TIP } from "@/talkstay/lib/guestAccessCopy";

/** Compact reminder: guests can scan or use the emailed Room Assistant link. */
export default function GuestAccessTip({
  className = "",
  compact = false,
}: {
  className?: string;
  /** Shorter padding for dense panels. */
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-violet-200/80 bg-violet-50/60 text-violet-950 ${
        compact ? "px-3 py-2.5" : "p-4"
      } ${className}`}
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex shrink-0 items-center gap-1 text-violet-700">
          <QrCode className="h-4 w-4" aria-hidden />
          <Mail className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          {!compact && (
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80">
              {GUEST_ACCESS_HEADLINE}
            </p>
          )}
          <p className={`text-sm leading-relaxed text-violet-950/90 ${compact ? "" : "mt-0.5"}`}>
            {GUEST_ACCESS_TIP}
          </p>
        </div>
      </div>
    </div>
  );
}
