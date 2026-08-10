// Short two-note chime for in-app alerts — WebAudio so there's no asset to ship.
// Browsers block audio until a user gesture; call primeChime() from a click/tap
// (also auto-primes on the first pointer/key event).

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch {
    return null;
  }
}

async function resumeCtx(c: AudioContext): Promise<boolean> {
  try {
    if (c.state === "suspended") await c.resume();
    return c.state === "running";
  } catch {
    return false;
  }
}

/** Unlock audio within a user gesture (Safari/iOS require this). */
export function primeChime() {
  const c = ensureCtx();
  if (!c) return;
  void resumeCtx(c).then((ok) => {
    if (!ok) return;
    // Near-silent blip satisfies the autoplay unlock without being audible.
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001;
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.02);
  });
}

/** Play the alert chime. Safe to call from async/realtime paths. */
export async function playChime(): Promise<void> {
  const c = ensureCtx();
  if (!c) return;
  const ok = await resumeCtx(c);
  if (!ok) return;

  const now = c.currentTime;
  // Two ascending notes (G5 → C6), soft attack/decay — loud enough to notice.
  [
    { f: 784, t: 0 },
    { f: 1047, t: 0.14 },
  ].forEach(({ f, t }) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = f;
    const start = now + t;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
    o.connect(g); g.connect(c.destination);
    o.start(start); o.stop(start + 0.35);
  });
}

// Auto-prime on the very first interaction anywhere in the app.
if (typeof window !== "undefined") {
  const prime = () => {
    primeChime();
    window.removeEventListener("pointerdown", prime);
    window.removeEventListener("keydown", prime);
  };
  window.addEventListener("pointerdown", prime, { once: true });
  window.addEventListener("keydown", prime, { once: true });
}
