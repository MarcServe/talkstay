# Landing-page marketing images

Drop your hospitality photos here with these exact filenames and they appear
on the landing page automatically — no code changes needed. Until a file is
present, that slot shows an on-brand violet gradient (never a broken image).

| Filename         | Where it shows           | Suggested shot                                   |
| ---------------- | ------------------------ | ------------------------------------------------ |
| `hero.jpg`       | Hero, right side         | A relaxed guest / warm, inviting room            |
| `step-scan.jpg`  | How it works — step 1    | Guest scanning the in-room QR code with a phone  |
| `step-speak.jpg` | How it works — step 2    | Guest speaking into their phone                  |
| `step-relax.jpg` | How it works — step 3    | A clean room, or the guest relaxing              |

Tips:
- JPG or WebP, landscape. Hero looks best around 5:4; the step cards are 3:2.
- Keep each file well under ~500 KB so the page stays fast (these are NOT
  precached by the service worker, so they load on demand).
- The filenames are referenced in `src/talkstay/pages/Landing.tsx` (the `IMG`
  map) — change them there if you'd rather use different names.
