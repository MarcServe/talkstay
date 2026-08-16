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

// ---- iOS-safe playback ------------------------------------------------------
// iOS routes WebAudio through a session that the hardware ring/silent switch
// mutes — true even in an installed PWA, which is why the picker's Play button
// was silent on iPhone while working on desktop. HTMLAudioElement playback uses
// the media channel instead and is heard regardless of the switch. So render
// the very same tones to a WAV and play them through one shared <audio>,
// keeping WebAudio as the fallback. Still no audio files to ship.

const SAMPLE_RATE = 44100;

/** Render tones to a 16-bit mono WAV as a data: URI. */
function renderWavDataUri(tones: Tone[]): string {
  const total = Math.max(...tones.map((t) => t.t + (t.dur ?? 0.35))) + 0.05;
  const frames = Math.ceil(total * SAMPLE_RATE);
  const pcm = new Float32Array(frames);

  for (const { f, t, dur = 0.35, type = "sine", peak = 0.28 } of tones) {
    const start = Math.floor(t * SAMPLE_RATE);
    const len = Math.ceil(dur * SAMPLE_RATE);
    const attack = 0.02;
    for (let i = 0; i < len; i++) {
      const at = start + i;
      if (at >= frames) break;
      const time = i / SAMPLE_RATE;
      // Mirrors the WebAudio gain envelope: fast attack, exponential decay.
      const env = time < attack
        ? (time / attack) * peak
        : peak * Math.pow(0.0001 / peak, (time - attack) / Math.max(0.001, dur - attack));
      const phase = 2 * Math.PI * f * time;
      const wave = type === "triangle"
        ? (2 / Math.PI) * Math.asin(Math.sin(phase))
        : Math.sin(phase);
      pcm[at] += wave * env;
    }
  }

  const bytes = new Uint8Array(44 + frames * 2);
  const view = new DataView(bytes.buffer);
  const tag = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  tag(0, "RIFF");
  view.setUint32(4, 36 + frames * 2, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);   // PCM chunk size
  view.setUint16(20, 1, true);    // format = PCM
  view.setUint16(22, 1, true);    // mono
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true); // byte rate
  view.setUint16(32, 2, true);    // block align
  view.setUint16(34, 16, true);   // bits per sample
  tag(36, "data");
  view.setUint32(40, frames * 2, true);
  for (let i = 0; i < frames; i++) {
    const clamped = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const wavCache = new Map<AlertSoundId, string>();
function wavFor(id: AlertSoundId): string {
  let uri = wavCache.get(id);
  if (!uri) {
    uri = renderWavDataUri(tonesFor(id));
    wavCache.set(id, uri);
  }
  return uri;
}

/** Silent clip used to unlock playback. It has to be genuinely silent rather
 *  than a real sound at volume 0, because iOS makes HTMLMediaElement.volume
 *  read-only — assigning 0 there is a no-op and the user would hear a ping on
 *  their first tap anywhere in the app. */
let silentUri: string | null = null;
function silentWav(): string {
  if (!silentUri) silentUri = renderWavDataUri([{ f: 440, t: 0, dur: 0.01, peak: 0 }]);
  return silentUri;
}

let el: HTMLAudioElement | null = null;
function ensureEl(): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!el) {
    el = new Audio();
    el.preload = "auto";
    // Keeps iOS from taking the player fullscreen and from pausing other audio
    // any longer than the alert itself.
    el.setAttribute("playsinline", "");
  }
  return el;
}

/** Returns true when the alert was actually handed to the media channel. */
async function playViaElement(id: AlertSoundId): Promise<boolean> {
  const a = ensureEl();
  if (!a) return false;
  try {
    a.pause();
    a.src = wavFor(id);
    a.currentTime = 0;
    await a.play();
    return true;
  } catch {
    return false;
  }
}

/** Unlock audio within a user gesture (Safari/iOS require this). */
export function primeChime() {
  // Unlock the media element too — iOS only allows later programmatic play()
  // on an element that has already played inside a gesture, and alerts fire
  // from a server event, never from a tap.
  const a = ensureEl();
  if (a && !a.src) {
    try {
      a.src = silentWav();
      void a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
    } catch { /* fall through to WebAudio */ }
  }

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
 * (e.g. for preview in the picker). Media element first so iPhones on silent
 * still hear it; WebAudio only if that path is unavailable.
 */
export async function playChime(soundId?: AlertSoundId): Promise<void> {
  const id = soundId ?? getAlertSoundId();
  if (await playViaElement(id)) return;

  const c = ensureCtx();
  if (!c) return;
  const ok = await resumeCtx(c);
  if (!ok) return;
  playTones(c, tonesFor(id));
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
