# Landing-page marketing images

These are the photos shown on the landing page (referenced by the `IMG` map in
`src/talkstay/pages/Landing.tsx`). To swap one, drop a replacement here **with
the same filename** — no code change needed. If a file is ever missing, its
slot falls back to an on-brand violet gradient rather than a broken image.

| Filename            | Where it shows        | What it is                                        |
| ------------------- | --------------------- | ------------------------------------------------- |
| `hero-scan.jpg`     | Hero (photo panel)    | Hand scanning the in-room TalkStay QR stand       |
| `how-it-works.jpg`  | "How it works"        | Six-step storyboard (scan → speak → done → relax) |
| `guest-square.jpg`  | Closing CTA band      | Square "handled beautifully, from anywhere" shot  |

The hero **headline, badge, logo and hospitality bar are HTML/CSS** (not baked
into an image) so they stay readable on mobile. The old full `hero-banner.jpg`
composite is unused by the page and can be deleted when convenient.

Tips:
- JPG or WebP. Marketing images are NOT precached by the service worker, so
  they load on demand — keep them light.
