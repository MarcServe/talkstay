# Staging Environment Setup Guide

## 🚧 Staging Environment Implemented

Your TalkWeb project now has proper staging/production separation to prevent development changes from affecting live client widgets.

## Environment Structure

### 1. **Production Environment**
- **Domain**: `https://talkweb.io`
- **Widget Script**: `https://talkweb.io/widget.js`
- **Purpose**: Live client widgets - STABLE
- **Assistant IDs**: Production assistant IDs
- **Safety**: Protected from development changes

### 2. **Staging Environment**
- **Domain**: `https://staging.talkweb.io` (to be set up)
- **Widget Script**: `https://staging.talkweb.io/widget-staging.js`
- **Purpose**: Testing and development - SAFE TO EXPERIMENT
- **Assistant IDs**: Staging-specific assistant IDs (prefixed with 'staging-')
- **Visual Indicator**: Orange "STAGING" badge on widgets and app

### 3. **Development Environment**
- **Domain**: `http://localhost:8080`
- **Widget Script**: `http://localhost:8080/widget-staging.js`
- **Purpose**: Local development
- **Visual Indicator**: Blue "DEVELOPMENT" badge

## Key Features Implemented

✅ **Environment Detection**: Automatic environment detection based on hostname  
✅ **Environment-Aware Widget**: Separate staging widget with visual indicators  
✅ **Environment Banner**: Visual indication of current environment  
✅ **Admin Environment Switcher**: Easy switching between environments  
✅ **Staging Assistant IDs**: Separate assistant configurations for testing  
✅ **Visual Indicators**: Clear staging/development badges  
✅ **Safe Testing**: Development changes won't affect production widgets  

## How to Use

### For Development & Testing
1. **Work in Development**: Make changes in your Lovable editor (localhost:8080)
2. **Test Staging**: Deploy to staging domain when ready to test
3. **Use Staging Widget**: Test with the staging widget script:
   ```html
   <script 
     data-assistant="staging-d872e528-d39d-4d53-9f03-1eb7bd724048" 
     data-base-url="https://staging.talkweb.io"
     src="https://staging.talkweb.io/widget-staging.js">
   </script>
   ```

### For Production Deployment
1. **Test Thoroughly**: Ensure everything works in staging
2. **Publish to Production**: Only publish to talkweb.io when ready
3. **Client Widgets**: Remain unaffected during development

## Next Steps

1. **Set Up Staging Domain**:
   - Configure `staging.talkweb.io` in your domain settings
   - Point it to your Lovable project

2. **Create Staging Assistants**:
   - Duplicate your production assistants
   - Prefix IDs with 'staging-' for testing

3. **Update Workflow**:
   - Always test in staging first
   - Only publish to production when confident
   - Use the admin environment switcher to manage deployments

## Admin Controls

Navigate to **Admin Settings** to access the Environment Switcher:
- View current environment status
- Switch between environments
- Access staging widget scripts
- Monitor environment configurations

## Benefits

🛡️ **Protection**: Live client widgets are protected from development changes  
🧪 **Safe Testing**: Experiment freely in staging without affecting clients  
📊 **Clear Separation**: Visual indicators prevent confusion  
🔄 **Easy Switching**: Admin interface for environment management  
📈 **Professional Workflow**: Industry-standard development practices  

Your staging environment is now ready for safe development and testing! 🚀