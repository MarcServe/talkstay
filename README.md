# TalkWeb Voice Buddy

TalkWeb Voice Buddy is an AI-powered voice and chat assistant that helps prospective customers discover services, capture leads, and schedule bookings. The web app is built with Vite/React (TypeScript + Tailwind + shadcn/ui) and relies on Supabase for data, authentication, and edge functions that orchestrate bookings, notifications, and real-time voice experiences.

---

## 1. Core Features

- **Voice & Chat Assistant** – Real-time WebRTC audio, speech-to-text, and text-to-speech pipelines that integrate with OpenAI’s realtime APIs.
- **Smart Booking Flows** – Supabase functions (`book-appointment`, `enhanced-booking`, `get-available-slots`, etc.) coordinate availability checks, conflict prevention, and automated email notifications via Resend.
- **Multi-tenant Assistants** – Environment-aware configuration for production, staging, demos, and embedded widgets.
- **Contact Routing** – Functions that deliver follow-ups through phone, WhatsApp, Calendly, and email.
- **Analytics & Limits** – Usage tracking, subscription limits, and scheduled maintenance tasks executed with Supabase RPCs/functions.

---

## 2. Tech Stack Overview

| Layer | Technology | Notes |
| ----- | ---------- | ----- |
| Frontend | Vite + React 18 + TypeScript | Uses Tailwind CSS, shadcn/ui, React Query, Radix UI primitives |
| Voice/Realtime | OpenAI realtime API, WebRTC, custom `RealtimeChat` utility | Manages microphone capture, streaming audio, and transcription |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth) | Functions written in TypeScript (Deno runtime) |
| Email | Resend | Confirmation and notification emails for bookings |
| Hosting | Vercel (web) + Supabase (edge) | Lovable design to Vercel deployment pipeline |

Supporting documentation lives in `/docs` and the suite of operational guides (`PRODUCTION_DEPLOYMENT.md`, `DATABASE_VERSIONING.md`, etc.).

---

## 3. Repository Structure (High Level)

```
├── src/                  # Vite/React source
│   ├── components/       # UI + feature components (booking modals, voice UI)
│   ├── hooks/            # Custom hooks (voice booking, realtime, etc.)
│   ├── pages/            # Route-level pages (marketing, dashboards, previews)
│   ├── utils/            # Client utilities (conversation memory, TTS, etc.)
│   └── integrations/     # Supabase client and typed helpers
├── supabase/
│   ├── functions/        # Edge functions (Deno/TypeScript)
│   ├── migrations/       # Database schema migrations
│   └── config.toml       # Supabase CLI configuration
├── docs/                 # Feature and workflow documentation
└── scripts/              # Automation (migrations, environment checks, etc.)
```

---

## 4. Prerequisites

1. **Node.js** ≥ 18.17 (install via [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)).
2. **npm** (ships with Node) – bun/PNPM aren’t officially supported here.
3. **Supabase CLI** ≥ 1.187 (used to deploy edge functions). Install with:
   ```bash
   brew install supabase/tap/supabase
   ```
4. Access to the shared Supabase project (`oujqkygfmyapmrgxmhvt`) and a Resend API key for transactional email.

> **Note:** There is no `.env` file by default. Most configuration is environment-detected (`src/config/environment.ts`) or stored in Supabase secrets.

---

## 5. Local Development

```bash
# 1. Clone the repo
git clone https://github.com/MarcServe/talkweb-voice-buddy.git
cd talkweb-voice-buddy/talkweb-voice-buddy-main

# 2. Install dependencies
npm install

# 3. (Optional) log into Supabase if you need to invoke edge functions locally
supabase login

# 4. Start the Vite dev server (default http://localhost:5173)
npm run dev
```

### Useful scripts

- `npm run dev` – Vite dev server with hot module reload.
- `npm run build` – Production build (invoked by CI/Vercel).
- `npm run build:dev` – Dev-mode bundle for experiments.
- `npm run preview` – Serve the production build locally.
- `npm run lint` – Lint with ESLint + TypeScript rules.

---

## 6. Supabase Functions & Deployments

Edge functions live under `supabase/functions/<name>/index.ts`. Key ones include:

- `book-appointment` – Stores bookings, normalizes times, sends confirmation emails, and returns Calendly URLs.
- `enhanced-booking` – Orchestrates availability checks (Calendly, manual time slots, conflict detection) before invoking `book-appointment`.
- `get-available-slots` – Exposes manual time-slot availability for the availability picker.
- `realtime-token`, `realtime-voice-form`, `voice-session` – Provide temporary auth and orchestrate the voice/WebRTC handshake.
- `calendly-integration`, `google-calendar-oauth`, `outlook-calendar-integration` – Calendar-specific helpers.
- Additional utilities for notifications, analytics, subscription limits, etc.

### Deploying a function

```bash
supabase functions deploy book-appointment
supabase functions deploy enhanced-booking
```

Deploying any function pushes directly to production for project `oujqkygfmyapmrgxmhvt`, so double-check your changes before running the command. CI does **not** deploy edge functions automatically.

### Testing a function locally

```bash
supabase functions serve book-appointment --env-file supabase/.env
```

> Create `supabase/.env` with any secrets you wish to override locally. By default the CLI will use secrets stored in Supabase.

---

## 7. Environment & Deployment Workflow

- **Development**: Run locally via `npm run dev` and (optionally) `supabase functions serve`.
- **Staging**: The `refinement` branch deploys to Vercel’s staging environment (`staging.talkweb.io`). Supabase edge functions must be deployed manually.
- **Production**: Merges into `main` deploy to `talkweb.io` via Vercel.
- **Design pipeline**: Changes can originate in Lovable, GitHub, or local dev. Lovable commits land on GitHub; Vercel auto-builds per branch.

Refer to:
- `PRODUCTION_DEPLOYMENT.md` – Full deployment checklist.
- `RELEASE_MANAGEMENT.md` – Branching/tagging strategy.
- `REFINEMENT_WORKFLOW.md` – Guidance for the staging branch.

---

## 8. Common Tasks

| Task | Command / Notes |
| ---- | ---------------- |
| Run linting | `npm run lint` |
| Build production assets | `npm run build` |
| Preview production build locally | `npm run preview` |
| Update dependencies | `npm install <package>@latest` |
| Database migrations | Follow `DATABASE_VERSIONING.md` + scripts in `scripts/database/` |
| Deploy edge function | `supabase functions deploy <name>` |

---

## 9. Contributing & Review Checklist

1. Create a feature branch from `refinement` (or `main` if hotfix).
2. Implement changes with appropriate tests or manual verification.
3. Run `npm run lint` and `npm run build` locally.
4. Commit with a conventional message (`feat:`, `fix:`, etc.).
5. Push to GitHub and open a PR. Reviewers focus on booking flows, voice regression, and Supabase migrations.
6. When touching edge functions, redeploy after merge.

See `DEVELOPMENT_GUIDELINES.md` and `HYBRID_WORKFLOW_GUIDE.md` for coding standards and Lovable-to-GitHub workflows.

---

## 10. Support & Contacts

- **Product & Design**: Lovable project – https://lovable.dev/projects/be77a757-cbfb-4fc8-949b-c9193bff4ba9
- **Deployments**: Vercel dashboard (`talkweb-voice-buddy`) & Supabase project (`oujqkygfmyapmrgxmhvt`)
- **Issues / Bugs**: Open GitHub issues or reach out in the TalkWeb engineering Slack channel.

---

Happy building! Capture any new environment or deployment steps in `/docs` so the rest of the team can follow along.
