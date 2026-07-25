# 🔒 Branch Protection Implementation Guide

## Step 1: GitHub Repository Settings

Navigate to your GitHub repository and follow these steps:

### 1.1 Access Branch Protection Settings
```
Repository → Settings → Branches → Add rule
```

### 1.2 Configure Main Branch Protection

**Branch name pattern:** `main`

**Required settings:**
- ✅ **Require a pull request before merging**
  - Required approving reviews: `1`
  - ✅ Dismiss stale PR approvals when new commits are pushed
  - ✅ Require review from code owners

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Required status checks:
    - `deploy-production`
    - `build`
    - `test`

- ✅ **Require conversation resolution before merging**
- ✅ **Restrict pushes that create files larger than 100MB**
- ❌ **Allow force pushes** (UNCHECK - disabled for safety)
- ❌ **Allow deletions** (UNCHECK - disabled for safety)

### 1.3 Configure Refinement Branch Protection (Optional)

**Branch name pattern:** `refinement/**`

**Lighter protection for development:**
- ✅ **Require status checks to pass before merging**
  - Required status checks:
    - `deploy-staging`
    - `build`

## Step 2: GitHub CLI Alternative (Advanced Users)

If you prefer using GitHub CLI:

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Enable main branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["deploy-production","build"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":true}' \
  --field restrictions=null

# Verify protection is enabled
gh api repos/:owner/:repo/branches/main/protection
```

## Step 3: Replace "owner" in CODEOWNERS

Update `.github/CODEOWNERS` file:
```
# Replace @owner with your actual GitHub username
* @your-github-username

# For teams, you can use:
* @your-org/team-name
```

## Step 4: Test the Protection

1. Try to push directly to main (should be blocked)
2. Create a test PR from a feature branch
3. Verify approval is required before merge
4. Check that status checks must pass

## Step 5: New Workflow After Protection

### For Development:
1. Work continues normally in Lovable
2. Changes auto-sync to `refinement/v1.1` branch
3. Staging deploys automatically for testing

### For Production Releases:
1. Create PR: `refinement/v1.1` → `main`
2. Review changes (especially `public/widget.js`)
3. Approve PR after review
4. Merge triggers production deployment
5. Widget changes are now controlled and reviewed

## ⚠️ Important Notes

- **Widget Security**: All `public/widget.js` changes now require approval
- **Emergency Override**: Admins can temporarily disable protection for critical hotfixes
- **Team Permissions**: Ensure team members have appropriate repository access
- **Status Checks**: GitHub Actions must pass before merge is allowed

## Next Steps

1. ✅ Branch protection rules configured
2. ✅ CODEOWNERS file created
3. 🔄 Test with a sample PR
4. 📋 Train team on new workflow
5. 📋 Document emergency procedures