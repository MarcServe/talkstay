import { useEffect, useState } from "react";
import { Mail, QrCode, X } from "lucide-react";
import { GUEST_ACCESS_HEADLINE, GUEST_ACCESS_TIP } from "@/talkstay/lib/guestAccessCopy";

/** Compact reminder: guests can scan or use the emailed Room Assistant link. */
export default function GuestAccessTip({
  className = "",
  compact = false,
  dismissKey,
}: {
  className?: string;
  /** Shorter padding for dense panels. */
  compact?: boolean;
  /** Set to let someone close this for good — onboarding copy shouldn't hold
   *  screen space on a board they read every shift. Omit to keep it pinned. */
  dismissKey?: string;
}) {
  const storeKey = dismissKey ? `talkstay.tip.${dismissKey}` : null;
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!storeKey) return;
    try {
      setHidden(localStorage.getItem(storeKey) === "1");
    } catch {
      // Private browsing — show the tip rather than fail.
    }
  }, [storeKey]);

  if (hidden) return null;

  return (
    <div
      className={`rounded-2xl border border-violet-200/80 dark:border-violet-400/30 bg-violet-50/60 dark:bg-violet-400/15 text-violet-950 dark:text-violet-200 ${
        compact ? "px-3 py-2.5" : "p-4"
      } ${className}`}
      role="note"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex shrink-0 items-center gap-1 text-violet-700 dark:text-violet-200">
          <QrCode className="h-4 w-4" aria-hidden />
          <Mail className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          {!compact && (
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-800/80 dark:text-violet-200">
              {GUEST_ACCESS_HEADLINE}
            </p>
          )}
          <p className={`text-sm leading-relaxed text-violet-950/90 dark:text-violet-200 ${compact ? "" : "mt-0.5"}`}>
            {GUEST_ACCESS_TIP}
          </p>
        </div>
        {storeKey && (
          <button
            type="button"
            onClick={() => {
              setHidden(true);
              try {
                localStorage.setItem(storeKey, "1");
              } catch {
                // Not persisting is fine; it stays hidden for this session.
              }
            }}
            className="-mr-1 -mt-0.5 ml-auto shrink-0 rounded p-1 text-violet-700/70 hover:bg-violet-500/10 hover:text-violet-900 dark:text-violet-200/70 dark:hover:text-violet-100"
            aria-label="Dismiss tip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
