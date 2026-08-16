// In-app alert sounds via WebAudio — no audio files to ship.
// Browsers block audio until a user gesture; call primeChime() from a click/tap
// (also auto-primes on the first pointer/key event).

export type AlertSoundId =
  | "classic"
  | "soft_ping"
  | "bright_ding"
  | "double_knock"
  | "urgent"
  | "soft_bell";

export type AlertSoundOption = {
  id: AlertSoundId;
  label: string;
  description: string;
};

/** Sounds managers can pick for new-request / escalation alerts. */
export const ALERT_SOUNDS: AlertSoundOption[] = [
  { id: "classic", label: "Classic chime", description: "Two ascending notes — default" },
  { id: "soft_ping", label: "Soft ping", description: "Single gentle tone" },
  { id: "bright_ding", label: "Bright ding", description: "Higher, clearer ping" },
  { id: "double_knock", label: "Double knock", description: "Two short taps" },
  { id: "urgent", label: "Urgent cascade", description: "Three rising notes" },
  { id: "soft_bell", label: "Soft bell", description: "Longer soft ring" },
];

const STORAGE_KEY = "talkstay_alert_sound";
const DEFAULT_SOUND: AlertSoundId = "classic";

export function isAlertSoundId(v: unknown): v is AlertSoundId {
  return typeof v === "string" && ALERT_SOUNDS.some((s) => s.id === v);
}

export function getAlertSoundId(): AlertSoundId {
  if (typeof window === "undefined") return DEFAULT_SOUND;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isAlertSoundId(raw)) return raw;
  } catch { /* private mode */ }
  return DEFAULT_SOUND;
}

export function setAlertSoundId(id: AlertSoundId): void {
  if (!isAlertSoundId(id)) return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch { /* ignore */ }
}

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

type Tone = {
  f: number;
  t: number;
  dur?: number;
  type?: OscillatorType;
  peak?: number;
};

function playTones(c: AudioContext, tones: Tone[]) {
  const now = c.currentTime;
  for (const { f, t, dur = 0.35, type = "sine", peak = 0.28 } of tones) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = f;
    const start = now + t;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start(start);
    o.stop(start + dur + 0.02);
  }
}

function tonesFor(id: AlertSoundId): Tone[] {
  switch (id) {
    case "soft_ping":
      return [{ f: 880, t: 0, dur: 0.28, peak: 0.22 }];
    case "bright_ding":
      return [
        { f: 1319, t: 0, dur: 0.22, peak: 0.26 },
        { f: 1760, t: 0.08, dur: 0.28, peak: 0.2 },
      ];
    case "double_knock":
      return [
        { f: 220, t: 0, dur: 0.12, type: "triangle", peak: 0.35 },
        { f: 196, t: 0.16, dur: 0.14, type: "triangle", peak: 0.32 },
      ];
    case "urgent":
      return [
        { f: 659, t: 0, dur: 0.2, peak: 0.26 },
        { f: 784, t: 0.12, dur: 0.2, peak: 0.28 },
        { f: 988, t: 0.24, dur: 0.28, peak: 0.3 },
      ];
    case "soft_bell":
      return [
        { f: 523, t: 0, dur: 0.55, peak: 0.2 },
        { f: 784, t: 0.04, dur: 0.6, peak: 0.12 },
      ];
    case "classic":
    default:
      // Two ascending notes (G5 → C6)
      return [
        { f: 784, t: 0, dur: 0.32, peak: 0.28 },
        { f: 1047, t: 0.14, dur: 0.32, peak: 0.28 },
      ];
  }
}

/** Unlock audio within a user gesture (Safari/iOS require this). */
export function primeChime() {
  const c = ensureCtx();
  if (!c) return;
  void resumeCtx(c).then((ok) => {
    if (!ok) return;
    const o = c.createOscillator();
    const g = c.createGain();
    g.gain.value = 0.0001;
    o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.02);
  });
}

/**
 * Play an alert sound. Uses the saved preference unless `soundId` is passed
 * (e.g. for preview in the picker).
 */
export async function playChime(soundId?: AlertSoundId): Promise<void> {
  const c = ensureCtx();
  if (!c) return;
  const ok = await resumeCtx(c);
  if (!ok) return;
  playTones(c, tonesFor(soundId ?? getAlertSoundId()));
}

/** Preview a specific sound from a user gesture (picker). */
export async function previewAlertSound(id: AlertSoundId): Promise<void> {
  primeChime();
  await playChime(id);
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
