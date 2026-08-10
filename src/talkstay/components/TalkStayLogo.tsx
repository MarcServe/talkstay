/** Shared TalkStay mark — the gradient speech-bubble "TS" used across the
 *  sidebar, auth page, and landing page so it stays identical everywhere. */
export default function TalkStayLogo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src="/marketing/talkstay-logo.png"
      alt="TalkStay"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
