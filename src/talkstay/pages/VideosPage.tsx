import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TalkStayLogo from "@/talkstay/components/TalkStayLogo";
import DemoVideo from "@/talkstay/components/DemoVideo";
import { USE_CASE_VIDEOS, VIDEO_THEMES, videosByTheme } from "@/talkstay/lib/videos";

/**
 * The video collection — one page that gathers every use-case clip.
 *
 * New videos are added in `src/talkstay/lib/videos.ts`; nothing here needs
 * touching. A theme with no videos yet simply doesn't render, so the grouping
 * can be planned ahead of the filming.
 */
export default function VideosPage() {
  const themes = VIDEO_THEMES.map((t) => ({ ...t, videos: videosByTheme(t.key) })).filter(
    (t) => t.videos.length > 0,
  );

  return (
    <div data-talkstay className="ts-atmosphere min-h-screen text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <TalkStayLogo size={28} />
          <span className="text-lg font-semibold tracking-tight">TalkStay</span>
        </Link>
        <Link
          to="/demo"
          className="inline-flex items-center text-sm font-semibold text-violet-700 transition-colors hover:text-violet-900 dark:text-violet-300 dark:hover:text-violet-200"
        >
          Try the demo
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Link>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {USE_CASE_VIDEOS.length} {USE_CASE_VIDEOS.length === 1 ? "video" : "videos"} · nothing
            to install
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">TalkStay on video</h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Short clips of real situations — a guest asking for something, a team picking it up.
            Press play on whichever one sounds like your property.
          </p>
        </div>

        {themes.map((theme, i) => (
          <section key={theme.key} className={i === 0 ? "mt-12" : "mt-16"}>
            <div className="border-t border-border pt-8">
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{theme.label}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{theme.blurb}</p>
            </div>

            {/* A lone video fills the width rather than sitting in half a row. */}
            <div
              className={
                theme.videos.length === 1
                  ? "mx-auto mt-6 max-w-3xl"
                  : "mt-6 grid gap-8 sm:grid-cols-2"
              }
            >
              {theme.videos.map((video) => (
                <article key={video.slug} id={video.slug} className="scroll-mt-24">
                  {/* The facade already carries the title across the thumbnail —
                      repeating it underneath just reads as a duplicate. */}
                  <DemoVideo url={video.url} title={video.title} caption={video.length} />
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{video.blurb}</p>
                </article>
              ))}
            </div>
          </section>
        ))}

        <div className="mx-auto mt-16 max-w-3xl rounded-3xl border border-violet-200 bg-white/80 p-6 text-center shadow-sm dark:border-violet-500/30 dark:bg-card/80 sm:p-8">
          <p className="text-lg font-semibold tracking-tight">Seen enough? Try it yourself.</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">
            The demos are live — the guest phone experience, or the dashboard your team would work
            from. No signup.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/demo/guest"
              className="inline-flex items-center rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-800"
            >
              Guest experience
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
            <Link
              to="/demo/operations"
              className="inline-flex items-center rounded-xl border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-800 shadow-sm transition hover:border-violet-500 dark:border-violet-500/40 dark:bg-transparent dark:text-violet-200 dark:hover:border-violet-400"
            >
              Staff operations
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" className="flex items-center gap-2 transition-colors hover:text-foreground">
            <TalkStayLogo size={22} />
            <span>© {new Date().getFullYear()} TalkStay by TalkWeb</span>
          </Link>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/demo" className="transition-colors hover:text-foreground">
              Demos
            </Link>
            <Link to="/support" className="transition-colors hover:text-foreground">
              Support
            </Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
