# Staging Environment Setup Guide 🚀

## Complete Staging Workflow for TalkWeb

### 1. Vercel Domain Configuration

**In your Vercel Dashboard:**
1. Go to your TalkWeb project settings → **Domains**
2. Click **Add Domain** and enter: `staging.talkweb.io`
3. Vercel will provide DNS instructions (usually automatic)
4. Wait for DNS propagation (up to 24-48 hours)

**Required Environment Variables in Vercel:**
- `VERCEL_TOKEN` (in GitHub Secrets)
- `VERCEL_ORG_ID` (in GitHub Secrets)  
- `VERCEL_PROJECT_ID` (in GitHub Secrets)

### 2. Stripe Configuration for Staging

**Add Staging Domain to Stripe:**
1. Go to Stripe Dashboard → **Settings** → **Developers**
2. Add `staging.talkweb.io` to allowed domains
3. Update webhook endpoints if you use them:
   - Add: `https://staging.talkweb.io/api/webhooks/stripe`

### 3. GitHub Workflow for Staging

**Automated Deployment Process:**

```bash
# Create a refinement branch for testing
git checkout -b refinement/new-feature

# Make your changes and commit
git add .
git commit -m "Add new feature for testing"

# Push to trigger staging deployment
git push origin refinement/new-feature
```

**This will automatically:**
- ✅ Deploy to `staging.talkweb.io`
- ✅ Run tests and validations
- ✅ Create staging widget at `staging.talkweb.io/widget-staging.js`

### 4. Testing Workflow

**Widget Testing on Staging:**
```html
<!-- Use this script for staging tests -->
<script 
  data-assistant="staging-d872e528-d39d-4d53-9f03-1eb7bd724048" 
  data-base-url="https://staging.talkweb.io"
  src="https://staging.talkweb.io/widget-staging.js">
</script>
```

**Test Pages:**
- Main staging site: `https://staging.talkweb.io`
- Widget test page: `https://staging.talkweb.io/widget-test-staging.html`
- Widget scenarios: `https://staging.talkweb.io/widget-test-scenarios.html`

### 5. Production Deployment

**After staging testing:**
1. Create Pull Request from `refinement/feature` → `main`
2. Review and approve PR
3. Merge to `main` triggers production deployment to `talkweb.io`

### 6. Environment Summary

| Environment | Domain | Widget Script | Purpose |
|-------------|--------|---------------|---------|
| **Development** | `localhost:8080` | `/widget-staging.js` | Local testing |
| **Staging** | `staging.talkweb.io` | `/widget-staging.js` | Client testing |
| **Production** | `talkweb.io` | `/widget.js` | Live clients |

### 7. Quick Setup Checklist

- [ ] Add `staging.talkweb.io` domain in Vercel
- [ ] Configure GitHub secrets for Vercel deployment
- [ ] Add staging domain to Stripe allowed domains
- [ ] Test staging deployment with refinement branch
- [ ] Verify widget works on staging domain
- [ ] Test complete workflow: staging → PR → production

### 8. Benefits

🛡️ **Safe Testing**: Test widgets without affecting live clients  
🔄 **CI/CD Pipeline**: Automated staging and production deployments  
🧪 **Real Environment**: Test with actual domain and Stripe integration  
📊 **Professional Workflow**: Industry-standard development practices  

Your staging environment is now ready for professional testing! 🎉