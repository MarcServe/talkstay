/**
 * The video collection.
 *
 * One entry per use case. Paste a YouTube link in any shape — watch, youtu.be,
 * /embed/, /shorts/ — `youTubeId` in DemoVideo parses all of them, so nothing
 * here needs an id extracted by hand.
 *
 * Order is the order they appear. Put the strongest story first: this page is
 * often someone's second impression, after the landing page and before the
 * demo.
 */
export interface UseCaseVideo {
  /** Stable slug — used as the anchor so a single video can be linked to. */
  slug: string;
  url: string;
  title: string;
  /** One line on what the video actually shows, in the guest's or the
   *  property's words rather than feature names. */
  blurb: string;
  /** Groups the page. Add a new one and a new section appears. */
  theme: VideoTheme;
  /** Shown under the play button. Optional — omit rather than guess. */
  length?: string;
}

export type VideoTheme = "overview" | "guest" | "operations";

export const VIDEO_THEMES: { key: VideoTheme; label: string; blurb: string }[] = [
  {
    key: "overview",
    label: "Start here",
    blurb: "What TalkStay is, in under a minute.",
  },
  {
    key: "guest",
    label: "What the guest sees",
    blurb: "The side a guest actually touches — scanning, asking, ordering.",
  },
  {
    key: "operations",
    label: "What the team sees",
    blurb: "Where a request lands, who it reaches, and how it gets closed.",
  },
];

export const USE_CASE_VIDEOS: UseCaseVideo[] = [
  {
    slug: "guest-requests",
    url: "https://www.youtube.com/watch?v=83u9qLpVlQ8",
    title: "Guest requests, handled beautifully",
    blurb: "A guest asks for something and it reaches the right team, without anyone picking up a phone.",
    theme: "overview",
    length: "46 seconds",
  },
  {
    slug: "lost-in-translation",
    url: "https://youtu.be/9CZtyHxaY0k",
    title: "A good stay shouldn't be lost in translation",
    blurb: "A guest asks in their own language, and the team reads it in theirs.",
    theme: "guest",
  },
];

export function videosByTheme(theme: VideoTheme): UseCaseVideo[] {
  return USE_CASE_VIDEOS.filter((v) => v.theme === theme);
}
