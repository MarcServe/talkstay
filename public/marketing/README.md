# Landing-page marketing images

These are the photos shown on the landing page and Experience TalkStay hub
(referenced by the `IMG` map in `src/talkstay/pages/Landing.tsx` and the
persona constants in `src/talkstay/pages/DemoHub.tsx`). To swap one, drop a
replacement here **with the same filename** — no code change needed. If a file
is ever missing, its slot falls back to an on-brand violet gradient (landing) or
the previous marketing photo (demo hub) rather than a broken image.

| Filename                 | Where it shows           | What it is                                              |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| `hero.webp` / `hero-720.webp` | Hero (LCP, preloaded) | Responsive WebP; JPG fallback is `hero.jpg`            |
| `hero.jpg`               | Hero JPG fallback        | Guest scanning the in-room TalkStay QR stand            |
| `hospitality-icon.png`   | Hero hospitality strip   | Line-art hotel / palm icon                              |
| `how-it-works.jpg`       | "How it works"           | Six-step storyboard (scan → speak → done → relax)       |
| `guest-square.jpg`       | Closing CTA band         | Square "handled beautifully, from anywhere" shot        |
| `auth-side.jpg`          | Sign-in side panel       | Hospitality photo beside the auth form                  |
| `demo-guest.jpg` (+ `.webp`) | Demo hub + landing demo CTA | Guest persona graphic ("Your Stay. Just Speak.")   |
| `demo-manager.jpg` (+ `.webp`) | Demo hub + landing demo CTA | Manager persona graphic (dashboard / request queue) |

Tips:
- Prefer WebP for the hero (`hero.webp` + `hero-720.webp`); keep `hero.jpg` as fallback.
- Marketing images are NOT precached by the service worker — keep them light.
- The landing hero is preloaded from `index.html` so it starts before the JS bundle.
- `demo-guest` / `demo-manager` are full marketing graphics (headline + features
  baked in). Keep DemoHub overlays minimal so the baked-in copy stays readable.
