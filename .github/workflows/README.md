# Deployment Workflows

**Rule: New code on refinement only. Production (talkweb.io) only from main.**

## Flow

1. **refinement** – All new code and edits go here. Pushes deploy to **Vercel Preview** and **staging.talkweb.io**. Never to Production / talkweb.io.
2. **main** – Updated only when you’re ready for production: merge **refinement** into **main**, then push **main**. That triggers Production deploy and updates **talkweb.io**.

Do **not** deploy refinement to Production. Do **not** push main until refinement has the code you want live.

---

## Staging (refinement) – Preview + staging.talkweb.io

- **File:** `staging-deploy.yml`
- **Triggers:** Push or PR to `refinement` or `refinement/**`
- **Deploys to:** Vercel **Preview** (preview URLs + **staging.talkweb.io**). No `--prod`, never talkweb.io.
- **Purpose:** Test and preview new code at https://staging.talkweb.io before going to production

## Production (main) – talkweb.io

- **File:** `production-deploy.yml`
- **Triggers:** Push to `main` or tags `v*`
- **Deploys to:** Vercel **Production** → **talkweb.io**
- **Purpose:** Live site. Only run after merging refinement into main and pushing main.

---

## Deploying new code to talkweb.io

```bash
# 1. Ensure refinement has the new code and is pushed
git checkout refinement
git add -A && git commit -m "Your message" && git push origin refinement

# 2. When ready for production: merge refinement into main, push main
git checkout main
git pull origin main
git merge refinement -m "Merge refinement into main: <description>"
git push origin main
```

After step 2, the Production workflow runs and talkweb.io serves the new code.
