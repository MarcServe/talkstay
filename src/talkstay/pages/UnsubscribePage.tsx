import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import NoIndexMeta from "@/talkstay/components/NoIndexMeta";
import { confirmUnsubscribe, previewUnsubscribe } from "@/talkstay/lib/guestComms";

/**
 * Public unsubscribe page for marketing / return-guest campaigns.
 * Link format: /unsubscribe?hotel=<id>&email=<email>&t=<hmac>
 */
export default function UnsubscribePage() {
  const [params] = useSearchParams();
  const hotelId = params.get("hotel") || "";
  const email = params.get("email") || "";
  const token = params.get("t") || "";

  const [loading, setLoading] = useState(true);
  const [hotelName, setHotelName] = useState("Property");
  const [already, setAlready] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!hotelId || !email || !token) {
      setError("This unsubscribe link is incomplete.");
      setLoading(false);
      return;
    }
    previewUnsubscribe({ hotelId, email, token })
      .then((p) => {
        setHotelName(p.hotelName);
        setAlready(p.already);
        if (p.already) setDone(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Invalid unsubscribe link"))
      .finally(() => setLoading(false));
  }, [hotelId, email, token]);

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmUnsubscribe({ hotelId, email, token });
      setDone(true);
      setAlready(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't unsubscribe");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <NoIndexMeta />
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <TalkStayLogo size={36} />
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking…
          </div>
        ) : error ? (
          <>
            <h1 className="text-lg font-semibold">Link not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
          </>
        ) : done ? (
          <>
            <h1 className="text-lg font-semibold">You’re unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {email} won’t receive offer emails from {hotelName} anymore.
              Operational messages about an active stay may still arrive if you asked for them.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">Unsubscribe from offers?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Stop marketing emails from <strong>{hotelName}</strong> to{" "}
              <span className="font-mono text-xs">{email}</span>.
            </p>
            <Button
              className="mt-5 w-full bg-violet-600 hover:bg-violet-700"
              disabled={busy}
              onClick={() => void confirm()}
            >
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Unsubscribe
            </Button>
          </>
        )}
        <p className="mt-6 text-xs text-muted-foreground">
          <Link to="/" className="underline underline-offset-2">TalkStay home</Link>
        </p>
      </div>
    </div>
  );
}
