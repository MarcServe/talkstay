# Landing-page marketing images

These are the branded graphics shown on the landing page (referenced by the
`IMG` map at the top of `src/talkstay/pages/Landing.tsx`). To swap one, drop a
replacement here **with the same filename** — no code change needed. If a file
is ever missing, its slot falls back to an on-brand violet gradient rather than
a broken image.

| Filename            | Where it shows        | What it is                                        |
| ------------------- | --------------------- | ------------------------------------------------- |
| `hero-banner.jpg`   | Hero (top)            | Wide brand banner — headline, logo, audiences     |
| `how-it-works.jpg`  | "How it works"        | Six-step storyboard (scan → speak → done → relax) |
| `guest-square.jpg`  | Closing CTA band      | Square "handled beautifully, from anywhere" shot  |

Tips:
- JPG or WebP, landscape (except the square). These were exported from the
  source PNGs with `sips` at ~1100–1600px wide, quality ~86, to keep each file
  under ~500 KB. Marketing images are NOT precached by the service worker, so
  they load on demand — keep them light.
- Because the headline text is baked into `hero-banner.jpg`, the page's own
  `<h1>` is screen-reader-only (SEO/accessibility) and the CTA buttons are real
  HTML below the image, so the primary action is always crisp and tappable.
