## Goal

Revert the homepage to use only the **original `HeroSection`** (purple gradient hero with mic visual and chat bubbles), and refresh **its copy** to the new "Instant Access to Information" positioning — no second hero band, no duplicate CTA strip.

## Changes

### 1. `src/pages/Index.tsx` — remove the band I added

- Delete the "Outcome-led repositioning band" `<section>` I inserted above `<HeroSection />`.
- Keep `<SectorsGrid />` (the "Who we deploy for" section) — but move it to render **after** `<HeroSection />` so the original hero is the first thing visible.
- Remove now-unused imports (`Badge`, `Calendar`, `openBookDemo`) if no longer referenced.

### 2. `src/components/HeroSection.tsx` — restyle copy only, keep layout/animations/visuals untouched

Replace **only the text content** of these four blocks (lines ~108–212). All Tailwind classes, motion variants, gradients, mic visual, chat bubbles, stats strip, and trust strip stay exactly as-is.

- **Badge** ("Conversational AI — Voice-First Layer for your Business") → **"Implementation-led · Outcome-first"**
- **Headline** ("Skip Scrolling → Just Ask") → **"Instant Access to → Information"** (same two-line treatment, same gradient on line 2)
- **Subtitle block** ("Skip the scrolling. Just ask." + "Give your customers instant answers…") →
  - Line 1 (bold): **"We deploy AI assistants for your organisation."**
  - Line 2 (muted): **"So your people find answers instantly — without searching PDFs, waiting on hold, or emailing support."**
- **Formula strip** ("scroll → search → read · ask → listen → act") → keep the same visual treatment but with new words:
  - Struck-through: **"search · scroll · wait on hold"**
  - Highlighted: **"ask → listen → act"**
- **Sub-copy paragraph** ("Let visitors talk to your business…") → **"Built for universities, NHS, councils, housing, charities, HR teams, and accessibility-first organisations. Trained on your content. Available on web, WhatsApp, phone, and voice."**
- **Closing statement card** ("Stop making visitors search…") → **"Stop making people search."** + muted: **"TalkWeb listens, understands, and responds instantly — turning every question into an answer."**
- **Primary CTA** ("Try It Free") → **"Book a Discovery Call"** (keep gradient button styling; change `onClick` to `openBookDemo` from `PricingSection`, drop the `useNavigate` for this button)
- **Secondary CTA** ("See Demo") → unchanged

The 6 benefit chips, the right-column mic visual, all chat bubbles, the stats strip, and the trust strip stay **exactly as they are**.

## Out of scope

- `SectorsGrid`, `PricingSection`, `Business.tsx`, sector pages, header, routes, `index.html` meta — all stay as they were after the last build.
- No changes to widget, voice, booking, AI chat, or SaaS pricing.

## Verification

- `/` loads with the original purple hero as the first thing on screen.
- Hero shows new "Instant Access to Information" headline, "Book a Discovery Call" primary CTA, original mic visual + bubbles + stats unchanged.
- "Who we deploy for" sector cards appear below the hero (not above).
- No duplicate hero band.
