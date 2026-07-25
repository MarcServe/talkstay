# Branch Protection Setup Guide

## 🔒 Main Branch Protection Rules

To protect the production-ready main branch, configure these GitHub branch protection rules:

### Required Settings for `main` branch:

1. **Restrict pushes that create files**
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1 (minimum)
   - ✅ Dismiss stale PR approvals when new commits are pushed
   - ✅ Require review from code owners (if CODEOWNERS file exists)

2. **Status Checks**
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Required status checks:
     - `deploy-production` (GitHub Action)
     - `build` (if separate build check exists)
     - `test` (if separate test check exists)

3. **Additional Restrictions**
   - ✅ Restrict pushes that create files
   - ✅ Include administrators in restrictions
   - ❌ Allow force pushes (disabled for safety)
   - ❌ Allow deletions (disabled for safety)

### GitHub CLI Setup Commands

```bash
# Enable branch protection for main
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["deploy-production"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null

# Verify protection is enabled
gh api repos/:owner/:repo/branches/main/protection
```

### Manual GitHub UI Setup

1. Navigate to: `Settings` → `Branches`
2. Click `Add rule` for branch `main`
3. Configure settings as listed above
4. Save the protection rule

## 🚀 Refinement Branch Guidelines

### Refinement branches (`refinement/**`) should:
- ✅ Allow direct pushes from Lovable auto-sync
- ✅ Allow force pushes for development flexibility
- ✅ Require status checks for staging deployment
- ❌ No approval requirements (development branch)

### Setup for `refinement/**` pattern:

```bash
# Enable lighter protection for refinement branches
gh api repos/:owner/:repo/branches/refinement%2F*/protection \
  --method PUT \
  --field required_status_checks='{"strict":false,"contexts":["deploy-staging"]}' \
  --field enforce_admins=false \
  --field required_pull_request_reviews=null \
  --field restrictions=null
```

## 📋 Implementation Checklist

### Initial Setup:
- [ ] Create `refinement/v1.1` branch from current main
- [ ] Configure main branch protection rules
- [ ] Set up refinement branch guidelines
- [ ] Test Lovable auto-sync with refinement branch
- [ ] Verify GitHub Actions work with new branch structure

### Team Setup:
- [ ] Add team members to repository with appropriate permissions
- [ ] Create CODEOWNERS file if needed
- [ ] Set up notification preferences
- [ ] Document emergency override procedures

### Verification:
- [ ] Test that direct pushes to main are blocked
- [ ] Test that PRs can be created to main
- [ ] Test staging deployment from refinement branch
- [ ] Test production deployment from main branch
- [ ] Test hotfix branch workflow

## 🔧 Emergency Override Procedures

### When Protection Must Be Bypassed:

1. **Critical Security Issue**:
   ```bash
   # Temporarily disable protection
   gh api repos/:owner/:repo/branches/main/protection --method DELETE
   
   # Apply critical fix directly to main
   # ... make changes ...
   
   # Re-enable protection immediately
   # ... run protection setup commands ...
   ```

2. **Lovable Sync Issues**:
   - Switch Lovable to work with hotfix branch
   - Apply fixes through normal PR process
   - Merge hotfix to both main and refinement branches

### Emergency Contacts:
- Repository Admin: [Add contact info]
- Technical Lead: [Add contact info]
- Emergency Hotline: [Add emergency procedures]

---

**Next Steps:**
1. Run the GitHub CLI commands or configure via UI
2. Test the protection rules with a test PR
3. Update team documentation with new procedures
4. Train team on emergency override procedures