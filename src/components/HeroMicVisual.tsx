import { motion } from "framer-motion";

/* ── Animated waveform bar ──────────────────────────────────── */
function WaveBar({ delay, maxH }: { delay: number; maxH: number }) {
  return (
    <motion.div
      className="rounded-full"
      style={{
        width: "6px",
        minHeight: "6px",
        background: "linear-gradient(to top, #7c3aed, #c084fc)",
      }}
      animate={{ height: [6, maxH, 8, maxH * 0.75, 6] }}
      transition={{ duration: 1.4, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* ── Expanding pulse ring ────────────────────────────────────── */
function PulseRing({ delay, size }: { delay: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        border: "1.5px solid rgba(167,139,250,0.45)",
      }}
      animate={{ scale: [1, 1.7], opacity: [0.55, 0] }}
      transition={{ duration: 2.4, delay, repeat: Infinity, ease: "easeOut" }}
    />
  );
}

/* ── Sound-wave arcs ─────────────────────────────────────────── */
function SoundWaves({ side }: { side: "left" | "right" }) {
  const flip = side === "right";
  return (
    <motion.div
      className="absolute top-1/2 -translate-y-1/2"
      style={flip ? { left: "calc(50% + 68px)" } : { right: "calc(50% + 68px)" }}
      animate={{ opacity: [0.25, 0.7, 0.25] }}
      transition={{ duration: 2.2, delay: flip ? 0.35 : 0, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <svg
        width="46"
        height="110"
        viewBox="0 0 46 110"
        fill="none"
        style={{ transform: flip ? "scaleX(-1)" : undefined }}
      >
        {/* Outer arc */}
        <path
          d="M38 8 Q4 55 38 102"
          stroke="rgba(167,139,250,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Inner arc */}
        <path
          d="M28 20 Q8 55 28 90"
          stroke="rgba(196,181,253,0.65)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}

/* ── Mic SVG ─────────────────────────────────────────────────── */
function MicSVG() {
  return (
    <svg
      width="54"
      height="74"
      viewBox="0 0 54 74"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Microphone"
    >
      {/* Capsule body */}
      <rect x="15" y="2" width="24" height="40" rx="12" fill="rgba(221,214,254,0.92)" />
      {/* Inner highlight stripe */}
      <rect x="20" y="6" width="6" height="18" rx="3" fill="rgba(255,255,255,0.38)" />
      {/* Stand arc */}
      <path
        d="M5 32 Q5 56 27 56 Q49 56 49 32"
        stroke="rgba(196,181,253,0.88)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Leg */}
      <line
        x1="27" y1="56" x2="27" y2="68"
        stroke="rgba(196,181,253,0.88)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Base */}
      <line
        x1="13" y1="68" x2="41" y2="68"
        stroke="rgba(196,181,253,0.88)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ── Main export ─────────────────────────────────────────────── */
const barHeights = [12, 20, 32, 26, 40, 36, 44, 38, 42, 28, 22, 14];

export function HeroMicVisual() {
  return (
    <div className="relative flex h-full w-full select-none items-center justify-center overflow-hidden">
      {/* Background radial glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full blur-3xl"
        style={{
          width: "300px",
          height: "300px",
          background:
            "radial-gradient(circle, rgba(124,58,237,0.38) 0%, rgba(124,58,237,0.08) 60%, transparent 100%)",
        }}
      />

      {/* Pulse rings */}
      <PulseRing delay={0}    size={148} />
      <PulseRing delay={0.8}  size={148} />
      <PulseRing delay={1.6}  size={148} />

      {/* Sound waves on both sides */}
      <SoundWaves side="left"  />
      <SoundWaves side="right" />

      {/* Mic icon with outer glow ring */}
      <motion.div
        className="relative z-10"
        animate={{ scale: [1, 1.045, 1] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Outer glow circle */}
        <div
          className="flex h-[136px] w-[136px] items-center justify-center rounded-full"
          style={{
            background:
              "radial-gradient(circle at 40% 35%, rgba(167,139,250,0.25) 0%, rgba(124,58,237,0.12) 100%)",
            border: "1px solid rgba(167,139,250,0.28)",
            boxShadow:
              "0 0 48px rgba(124,58,237,0.45), 0 0 96px rgba(124,58,237,0.18), inset 0 0 24px rgba(167,139,250,0.08)",
          }}
        >
          <MicSVG />
        </div>
      </motion.div>

      {/* Waveform bars */}
      <div
        className="absolute bottom-8 flex items-end gap-[5px]"
        aria-hidden="true"
      >
        {barHeights.map((maxH, i) => (
          <WaveBar key={i} delay={i * 0.09} maxH={maxH} />
        ))}
      </div>

      {/* Subtle top vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background:
            "linear-gradient(to bottom, rgba(8,9,26,0.5) 0%, transparent 100%)",
        }}
      />
    </div>
  );
}
