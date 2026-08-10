# Landing-page marketing images

These are the photos shown on the landing page (referenced by the `IMG` map in
`src/talkstay/pages/Landing.tsx`). To swap one, drop a replacement here **with
the same filename** — no code change needed. If a file is ever missing, its
slot falls back to an on-brand violet gradient rather than a broken image.

| Filename                 | Where it shows           | What it is                                              |
| ------------------------ | ------------------------ | ------------------------------------------------------- |
| `hero.jpg`               | Hero (right column)      | Guest scanning the in-room TalkStay QR stand            |
| `hospitality-icon.png`   | Hero hospitality strip   | Line-art hotel / palm icon                              |
| `how-it-works.jpg`       | "How it works"           | Six-step storyboard (scan → speak → done → relax)       |
| `guest-square.jpg`       | Closing CTA band         | Square "handled beautifully, from anywhere" shot        |
| `auth-side.jpg`          | Sign-in side panel       | Hospitality photo beside the auth form                  |

Tips:
- JPG or WebP. Marketing images are NOT precached by the service worker, so
  they load on demand — keep them light.
