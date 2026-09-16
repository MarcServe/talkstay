import { useEffect, useState } from "react";
import { X, Users } from "lucide-react";
import { DEPARTMENTS } from "@/talkstay/lib/hotels";

const KEY = (userId: string, hotelId: string) => `talkstay:teams:${userId}:${hotelId}`;

function labelFor(key: string, named: { key: string; display_name: string }[]) {
  return named.find((d) => d.key === key)?.display_name
    ?? DEPARTMENTS.find((d) => d.key === key)?.display_name
    ?? key.replace(/_/g, " ");
}

/**
 * Being moved between teams used to happen in silence — the dashboard just
 * quietly showed a different queue — or, through the Staff tab, arrived as an
 * email asking someone to set a password they already had. This says what
 * changed, in the place they are already looking.
 *
 * Remembered per user per property, so it appears once for a real change
 * rather than on every load.
 */
export default function TeamChangeNotice({ userId, hotelId, departmentKeys, departmentNames }: {
  userId: string | null | undefined;
  hotelId: string;
  /** Every department this member is on right now. */
  departmentKeys: string[];
  departmentNames: { key: string; display_name: string }[];
}) {
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    if (!userId || !hotelId) return;
    const current = [...departmentKeys].filter(Boolean).sort();
    let seen: string[] | null = null;
    try {
      const raw = localStorage.getItem(KEY(userId, hotelId));
      seen = raw ? (JSON.parse(raw) as string[]) : null;
    } catch {
      seen = null;
    }
    // First run records the baseline without announcing it — nobody wants to
    // be told about teams they have been on for a year.
    if (seen) {
      const fresh = current.filter((k) => !seen!.includes(k));
      if (fresh.length) setAdded(fresh);
    }
    try {
      localStorage.setItem(KEY(userId, hotelId), JSON.stringify(current));
    } catch {
      // Private browsing — the notice just won't persist its baseline.
    }
  }, [userId, hotelId, departmentKeys.join(",")]);

  if (!added.length) return null;

  const names = added.map((k) => labelFor(k, departmentNames));
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-violet-200/80 bg-violet-50/60 px-3 py-2.5 text-violet-950 dark:border-violet-400/30 dark:bg-violet-400/15 dark:text-violet-200">
      <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        You've been added to{" "}
        <span className="font-semibold">
          {names.length === 1
            ? names[0]
            : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`}
        </span>
        . Their requests are on your board now.
      </p>
      <button
        type="button"
        onClick={() => setAdded([])}
        aria-label="Dismiss"
        className="-mr-1 -mt-0.5 shrink-0 rounded p-1 hover:bg-violet-500/10"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
