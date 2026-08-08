/** The gradient rounded-square mark used across the sidebar, auth page, and
 *  landing page. A single shared component so the mark stays pixel-identical
 *  everywhere it appears. */
export default function TalkStayLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)",
      }}
    >
      <svg
        width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24"
        fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    </div>
  );
}
