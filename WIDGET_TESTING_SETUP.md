# 🧪 Widget Testing Environment - Complete Setup

## Overview

A comprehensive widget testing environment has been set up to safely test TalkWeb widgets during refinement without affecting production client websites.

## 🚀 What's Been Created

### 1. **Testing Dashboard** (`/admin/widget-testing`)
- **Location**: Admin → Widget Testing
- **Features**:
  - Environment-aware configuration
  - Multiple test scenarios
  - One-click script copying
  - Direct links to test pages
  - Safety indicators for production

### 2. **Test Pages**

#### A. **Comprehensive Staging Test** (`/widget-test-staging.html`)
- **Purpose**: Full-featured testing environment
- **Features**:
  - All assistant configurations
  - Environment detection
  - Copy-paste widget scripts
  - Visual staging indicators
  - Testing checklist

#### B. **Design Scenarios Test** (`/widget-test-scenarios.html`)
- **Purpose**: Test widget across different design contexts
- **Features**:
  - 5 different design scenarios:
    - Corporate gradient backgrounds
    - Minimal clean designs
    - Bold creative layouts
    - Dark themes
    - Mobile-responsive testing
  - Smooth navigation between scenarios
  - Widget status monitoring
  - Responsive design testing

#### C. **Simple Test Page** (`/test-widget.html`)
- **Purpose**: Basic functionality testing
- **Features**: Simple test environment for quick checks

### 3. **Enhanced Staging Widget** (`/widget-staging.js`)
- **Environment Detection**: Automatically adapts URLs based on hostname
- **Visual Indicators**: Clear "STAGING" badges
- **Legacy Cleanup**: Removes old widget conflicts
- **Safe Loading**: Only loads on appropriate domains

## 🔧 How to Use

### For Development/Refinement:

1. **Access Testing Dashboard**:
   ```
   Go to: /admin/widget-testing
   ```

2. **Test Locally**:
   ```html
   <!-- Development script (automatically detected) -->
   <script 
     data-assistant="e7fa0f16-ba8e-4277-bd80-70f0aa25cbad" 
     src="http://localhost:8080/widget-staging.js">
   </script>
   ```

3. **Test on Staging**:
   ```html
   <!-- Staging script (for Lovable preview domains) -->
   <script 
     data-assistant="e7fa0f16-ba8e-4277-bd80-70f0aa25cbad" 
     data-base-url="https://yourproject.lovable.app"
     src="https://yourproject.lovable.app/widget-staging.js">
   </script>
   ```

4. **Test Different Assistants**:
   - **TalkWeb**: `d872e528-d39d-4d53-9f03-1eb7bd724048`
   - **Biz Boosters**: `e7fa0f16-ba8e-4277-bd80-70f0aa25cbad`
   - **Diversity X**: `3e293468-05fe-4913-85d5-b560812a30c9`
   - **UK GOV**: `d948f650-ca3e-4a3b-b3ac-cc938e4ff590`
   - **We Make Change**: `7e5f233c-b996-4afe-b603-92d77bbe9ab1`

### For External Website Testing:

1. **Copy Script from Dashboard**: Use the Widget Testing Dashboard to get the correct script
2. **Add to Any Website**: Paste the script into any website's HTML
3. **Look for Staging Indicators**: Widget will show "STAGING" badges
4. **Test Functionality**: Voice, chat, responsiveness, etc.

## 🛡️ Safety Features

### Environment Protection:
- ✅ **Automatic Environment Detection**: Scripts adapt to localhost, staging, or production
- ✅ **Visual Staging Indicators**: Clear "STAGING" badges on non-production widgets
- ✅ **Protected Production**: `public/widget.js` remains unchanged and protected
- ✅ **Separate Configurations**: Staging uses different URLs and assistant IDs

### Testing Isolation:
- ✅ **Legacy Widget Cleanup**: Removes old widgets to prevent conflicts
- ✅ **Domain-Aware Loading**: Only loads on appropriate domains
- ✅ **Error Handling**: Graceful fallbacks and clear error messages
- ✅ **Console Logging**: Detailed logging for debugging

## 📋 Testing Checklist

### Basic Functionality:
- [ ] Widget appears with STAGING indicator
- [ ] Voice button opens microphone interface
- [ ] Chat button opens chat interface
- [ ] Chat loads correct assistant personality
- [ ] No console errors in developer tools

### Responsive Testing:
- [ ] Widget works on desktop (1920x1080)
- [ ] Widget works on tablet (768x1024)
- [ ] Widget works on mobile (375x667)
- [ ] Widget repositions correctly on orientation change

### Design Integration:
- [ ] Widget visible on light backgrounds
- [ ] Widget visible on dark backgrounds  
- [ ] Widget doesn't interfere with page functionality
- [ ] Widget maintains accessibility standards

### Cross-Browser Testing:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## 🔄 Development Workflow

### 1. **Make Changes**:
   - Edit components, styling, or functionality
   - Changes automatically appear in staging environment

### 2. **Test Locally**:
   - Use `/widget-test-staging.html` for comprehensive testing
   - Use `/widget-test-scenarios.html` for design context testing

### 3. **Test on External Sites**:
   - Copy staging script from Widget Testing Dashboard
   - Test on real external websites
   - Verify staging indicators appear

### 4. **Verify Safety**:
   - Confirm production `public/widget.js` unchanged
   - Check that live client widgets unaffected
   - Validate environment separation

### 5. **Deploy to Production**:
   - Only after thorough staging testing
   - Merge to main branch for production deployment

## 🌍 Environment URLs

| Environment | Base URL | Widget URL | Status |
|------------|----------|------------|---------|
| **Development** | `http://localhost:8080` | `/widget-staging.js` | 🔧 Dev |
| **Staging** | `https://yourproject.lovable.app` | `/widget-staging.js` | 🚧 Staging |
| **Production** | `https://talkweb.io` | `/widget.js` | ✅ Live |

## 🎯 Next Steps

1. **Access the Testing Dashboard**: Go to `/admin/widget-testing`
2. **Run Through Test Scenarios**: Use the provided test pages
3. **Test on External Sites**: Copy scripts and test on real websites
4. **Make Refinements**: Edit code knowing production is protected
5. **Deploy When Ready**: Merge to production after thorough testing

## 💡 Pro Tips

- **Use Browser DevTools**: Monitor console for widget loading status
- **Test Different Screen Sizes**: Use browser responsive design mode
- **Check Network Tab**: Verify correct URLs are being called
- **Test on Real Sites**: Don't just test on localhost - use actual external websites
- **Monitor Performance**: Check that widget doesn't slow down page loading

---

**🚨 Remember**: The production widget (`public/widget.js`) is protected and won't be modified during refinement. All testing uses the staging widget which has clear visual indicators.