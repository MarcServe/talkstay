# TalkWeb Widget Implementation Guide

## Your New Domain: https://talkweb.io

The widget has been updated and is ready for deployment on your new domain. Here's everything you need:

## Widget Script for Websites

**IMPORTANT: You MUST update your script to use the new domain!**

Replace your old script with this new one:

```html
<script 
  data-assistant="d872e528-d39d-4d53-9f03-1eb7bd724048" 
  data-base-url="https://talkweb.io"
  src="https://talkweb.io/widget.js">
</script>
```

**OLD SCRIPT (DON'T USE):**
```html
<script>
(function() {
  const script = document.createElement('script');
  script.src = 'https://be77a757-cbfb-4fc8-949b-c9193bff4ba9.lovableproject.com/widget.js';
  script.setAttribute('data-assistant', 'bdd10d9f-0f0b-4014-8d19-81994929b2c0');
  document.head.appendChild(script);
})();
</script>
```

## For Different Assistants

Replace the `data-assistant` value with the appropriate assistant ID:

- **TALKWEB Assistant**: `d872e528-d39d-4d53-9f03-1eb7bd724048`
- **Biz Boosters**: `e7fa0f16-ba8e-4277-bd80-70f0aa25cbad`  
- **Diversity X**: `3e293468-05fe-4913-85d5-b560812a30c9`
- **UK GOV**: `d948f650-ca3e-4a3b-b3ac-cc938e4ff590`
- **We make Change**: `7e5f233c-b996-4afe-b603-92d77bbe9ab1`

## What's Fixed

✅ **Proper Domain Configuration**: Widget always uses `https://talkweb.io` as base URL  
✅ **Better Error Handling**: Clear error messages and fallbacks  
✅ **Improved Styling**: Better mobile responsiveness and visual design  
✅ **Enhanced Voice Interface**: Larger, more user-friendly voice popup  
✅ **Cross-Domain Support**: Works on any website without restrictions  

## Testing the Widget

1. **Deploy your app to https://talkweb.io** (use Lovable's domain settings)
2. **Test on any website** by adding the script tag above
3. **Verify both voice and chat** functionality work correctly

## Next Steps

1. Connect your Lovable project to the domain `https://talkweb.io` in Project Settings → Domains
2. Wait for DNS propagation (up to 48 hours)
3. Test the widget script on a test page
4. Distribute to your clients

The widget is now production-ready and domain-independent! 🚀