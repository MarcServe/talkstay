// A short, pleasant two-note chime for new-request alerts — generated with
// WebAudio so there's no audio asset to ship. Browsers block audio until the
// user has interacted with the page, so call primeChime() from a user gesture
// (we also auto-prime on the first pointer/key event).

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Unlock audio within a user gesture (Safari/iOS require this). */
export function primeChime() {
  const c = ensureCtx();
  if (!c) return;
  // A near-silent blip satisfies the autoplay unlock without being audible.
  const o = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + 0.02);
}

export function playChime() {
  const c = ensureCtx();
  if (!c) return;
  const now = c.currentTime;
  // Two ascending notes (G5 → C6), soft attack/decay.
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
    g.gain.exponentialRampToValueAtTime(0.2, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
    o.connect(g); g.connect(c.destination);
    o.start(start); o.stop(start + 0.3);
  });
}

// Auto-prime on the very first interaction anywhere in the app.
if (typeof window !== "undefined") {
  const prime = () => { primeChime(); window.removeEventListener("pointerdown", prime); window.removeEventListener("keydown", prime); };
  window.addEventListener("pointerdown", prime, { once: true });
  window.addEventListener("keydown", prime, { once: true });
}
