# Branch Protection Setup Guide

## Prerequisites
You need admin access to the GitHub repository to set up branch protection rules.

## Setting Up Branch Protection

### 1. Navigate to Branch Protection Settings
1. Go to your GitHub repository
2. Click on **Settings** tab
3. Click on **Branches** in the left sidebar
4. Click **Add rule** next to "Branch protection rules"

### 2. Configure Main Branch Protection
Set up protection for the `main` branch with these settings:

**Branch name pattern:** `main`

**Protect matching branches:**
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners (if you have CODEOWNERS file)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Add these required status checks:
    - `deploy-production`
    - `build`
    - `test`

- ✅ **Require conversation resolution before merging**

- ✅ **Restrict pushes that create files larger than 100MB**

- ⚠️ **Allow force pushes** - UNCHECK this (disabled for production safety)

- ⚠️ **Allow deletions** - UNCHECK this (disabled for production safety)

### 3. Configure Refinement Branch Protection (Optional)
If you want lighter protection for `refinement/**` branches:

**Branch name pattern:** `refinement/**`

**Protect matching branches:**
- ✅ **Require status checks to pass before merging**
  - Add required status checks:
    - `deploy-staging`
    - `build`

### 4. Create CODEOWNERS File (Recommended)
Create `.github/CODEOWNERS` file in your repository:

```
# Global owners
* @yourusername @teammember

# Production-critical files require extra review
/.github/workflows/production-deploy.yml @yourusername
/vercel-production.json @yourusername
/public/widget.js @yourusername
```

## Verification
After setup, test that:
1. Direct pushes to `main` are blocked
2. PRs require approval before merging
3. Status checks must pass before merge
4. Force pushes are prevented

## Emergency Override
In critical situations, admins can temporarily disable protection:
1. Go to Settings > Branches
2. Click **Edit** on the protection rule
3. Temporarily disable required checks
4. **Remember to re-enable after emergency fix**

## Next Steps
After branch protection is active:
1. All changes to production must go through PRs
2. The production deploy workflow will only run on approved merges to `main`
3. `talkweb.io` will only update when GitHub Actions successfully deploys
4. Development work continues in Lovable with instant preview