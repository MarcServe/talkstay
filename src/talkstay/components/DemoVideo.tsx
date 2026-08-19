import { useState } from "react";
import { Play } from "lucide-react";

/**
 * The campaign walkthrough video.
 *
 * Paste any YouTube URL or bare id here — watch links, youtu.be links, /embed/
 * and /shorts/ all parse. Leave it empty and the whole section renders nothing,
 * so the page is safe to ship before the video exists.
 */
export const DEMO_VIDEO_URL = "";

/** Accepts a full YouTube URL in any of its shapes, or an id already extracted. */
export function youTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  // A bare id: 11 chars of the YouTube alphabet.
  if (/^[\w-]{11}$/.test(raw)) return raw;
  const m = raw.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? m[1] : null;
}

/**
 * A click-to-play facade rather than a bare <iframe>.
 *
 * An embedded player pulls roughly a megabyte of third-party JavaScript and
 * sets tracking cookies on every visit, whether or not anyone presses play —
 * on a page whose whole promise is "no signup, nothing to install", that is the
 * wrong first impression and the wrong privacy posture. We show YouTube's own
 * thumbnail and swap in the real player on the first click. Nothing reaches
 * YouTube's cookie domain until the viewer actually asks for the video, and we
 * use youtube-nocookie.com even then.
 */
export default function DemoVideo({
  url = DEMO_VIDEO_URL,
  title = "Watch how TalkStay works",
  className = "",
}: {
  url?: string;
  title?: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  // maxres doesn't exist for every upload; hq always does.
  const [thumb, setThumb] = useState<"maxresdefault" | "hqdefault">("maxresdefault");

  const id = youTubeId(url);
  if (!id) return null;

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-3xl border border-violet-300/70 bg-violet-950 shadow-sm ring-1 ring-violet-500/10">
        {/* Fixed 16:9 box so the page doesn't jump when the player loads. */}
        <div className="aspect-video w-full">
          {playing ? (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="group relative h-full w-full cursor-pointer"
              aria-label={`Play video: ${title}`}
            >
              <img
                src={`https://i.ytimg.com/vi/${id}/${thumb}.jpg`}
                onError={() => setThumb("hqdefault")}
                alt=""
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                loading="lazy"
                width={1280}
                height={720}
              />
              <span className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-950/10 to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-lg transition duration-300 group-hover:scale-110 group-hover:bg-white sm:h-20 sm:w-20">
                  {/* Nudged right: a triangle looks off-centre when centred on its bounding box. */}
                  <Play className="ml-1 h-7 w-7 fill-violet-700 text-violet-700 sm:h-8 sm:w-8" />
                </span>
              </span>
              <span className="absolute bottom-0 left-0 right-0 p-4 text-left sm:p-5">
                <span className="block text-base font-semibold text-white sm:text-lg">{title}</span>
                <span className="mt-0.5 block text-xs text-white/80">
                  Watch the walkthrough — about two minutes
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
