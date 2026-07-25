// Hotel-side app shell — staff Operations dashboard + hotel admin/onboarding.
// Auth gating and the real dashboards land in Phases 2 and 4.
export default function HotelApp() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold">TalkStay for Hotels</h1>
      <p className="text-sm text-muted-foreground">
        Operations dashboard &amp; onboarding coming in Phases 2–4.
      </p>
    </div>
  );
}
