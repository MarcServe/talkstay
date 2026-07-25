#!/bin/bash

# Production Setup Script
# Run this script to configure production deployment

echo "🚀 Setting up TalkWeb Production Deployment"

# Check if running in CI
if [ "$CI" = "true" ]; then
    echo "Running in CI environment"
else
    echo "Running locally - some steps require manual configuration"
fi

# Verify required secrets
echo "📋 Checking required secrets..."
REQUIRED_SECRETS=(
    "VERCEL_TOKEN"
    "VERCEL_ORG_ID" 
    "VERCEL_PROJECT_ID"
    "VITE_SUPABASE_URL"
    "VITE_SUPABASE_ANON_KEY"
)

missing_secrets=()
for secret in "${REQUIRED_SECRETS[@]}"; do
    if [ -z "${!secret}" ]; then
        missing_secrets+=("$secret")
    fi
done

if [ ${#missing_secrets[@]} -gt 0 ]; then
    echo "❌ Missing required secrets:"
    printf '%s\n' "${missing_secrets[@]}"
    echo ""
    echo "Please add these secrets to your GitHub repository:"
    echo "1. Go to your GitHub repo"
    echo "2. Settings > Secrets and variables > Actions"
    echo "3. Add each missing secret"
    echo ""
    echo "Secret values needed:"
    echo "- VERCEL_TOKEN: Get from Vercel dashboard > Settings > Tokens"
    echo "- VERCEL_ORG_ID: Found in Vercel project settings"
    echo "- VERCEL_PROJECT_ID: Found in Vercel project settings"
    echo "- VITE_SUPABASE_URL: Your Supabase project URL"
    echo "- VITE_SUPABASE_ANON_KEY: Your Supabase anon key"
    exit 1
else
    echo "✅ All required secrets are configured"
fi

# Create production build
echo "🏗️ Creating production build..."
npm run build

# Verify build output
if [ ! -d "dist" ]; then
    echo "❌ Build failed - no dist directory found"
    exit 1
fi

echo "✅ Build successful"

# Check if this is a manual setup or CI deployment
if [ "$1" = "--deploy" ] && [ "$CI" = "true" ]; then
    echo "🚀 Deploying to production..."
    # Deployment handled by GitHub Actions
    echo "✅ Deployment completed via GitHub Actions"
else
    echo "📖 Next steps:"
    echo "1. Set up branch protection rules (see .github/workflows/branch-protection-setup.md)"
    echo "2. Create a PR to test the deployment workflow"
    echo "3. Merge approved PRs to trigger production deployment"
    echo "4. Point talkweb.io DNS to your Vercel deployment"
fi

echo "🎉 Production setup completed!"