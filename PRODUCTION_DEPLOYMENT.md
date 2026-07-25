# Production Deployment Setup

## Overview
This document outlines the production deployment strategy that separates Lovable development from production releases.

## Current Issue
- `talkweb.io` currently reflects all changes made in Lovable in real-time
- No production controls or approval process

## Solution Implemented
A proper CI/CD pipeline with environment separation:

```
Lovable (Development) → GitHub → PR Review → Production (talkweb.io)
```

## Setup Steps

### 1. Configure Vercel Project
1. Create a new Vercel project connected to your GitHub repository
2. Set the build command to: `npm run build`
3. Set the output directory to: `dist`
4. Use the production configuration: `vercel-production.json`

### 2. Add Required GitHub Secrets
Go to GitHub Repository Settings > Secrets and variables > Actions:

```
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

### 3. Set Up Branch Protection
Follow the guide in: `.github/workflows/branch-protection-setup.md`

Key protections:
- Require PR approval for `main` branch
- Require status checks to pass
- Prevent direct pushes to `main`
- Prevent force pushes

### 4. Configure DNS
Point your `talkweb.io` domain to the Vercel production deployment instead of Lovable hosting.

## New Workflow

### Development (Current State)
- Work continues in Lovable with instant preview
- Changes sync to GitHub automatically
- Lovable environment treats itself as `development`

### Production Releases
1. **Create Pull Request**: Changes from Lovable appear as PR
2. **Review & Approve**: Team reviews the PR
3. **Merge to Main**: Approved changes merge to `main` branch
4. **Auto-Deploy**: GitHub Actions deploys to Vercel production
5. **Live Update**: `talkweb.io` updates with new version

## Environment Separation

| Environment | Domain | Purpose | Auto-Deploy |
|-------------|--------|---------|------------|
| Development | `*.lovable.app` | Lovable development | Instant |
| Staging | `staging.talkweb.io` | Testing/preview | On PR |
| Production | `talkweb.io` | Live site | On merge to main |

## File Structure
- `.github/workflows/production-deploy.yml` - Production deployment pipeline
- `.github/workflows/staging-deploy.yml` - Staging deployment pipeline  
- `vercel-production.json` - Production Vercel configuration
- `src/config/environment.ts` - Environment detection and config
- `scripts/setup-production.sh` - Setup script

## Benefits After Setup
✅ **Production Control**: No accidental production changes  
✅ **Code Review**: All changes reviewed before production  
✅ **Rollback Safety**: Easy to revert production if needed  
✅ **Environment Separation**: Clear development vs production boundaries  
✅ **CI/CD Pipeline**: Automated testing and deployment  

## Next Steps
1. Run `chmod +x scripts/setup-production.sh && ./scripts/setup-production.sh` to verify setup
2. Set up branch protection rules (see setup guide)
3. Configure Vercel project and add GitHub secrets
4. Update DNS to point to Vercel instead of Lovable
5. Test with a small PR to verify the workflow

## Emergency Procedures
If you need to make an emergency production change:
1. Temporarily disable branch protection (GitHub Settings > Branches)
2. Make the fix and push directly to `main`
3. Re-enable branch protection immediately after
4. Create a follow-up PR to document the emergency change

## Verification
After setup, verify:
- [ ] Direct pushes to `main` are blocked
- [ ] PRs require approval
- [ ] Production deploys only on approved merges
- [ ] `talkweb.io` only updates via GitHub Actions
- [ ] Development continues seamlessly in Lovable