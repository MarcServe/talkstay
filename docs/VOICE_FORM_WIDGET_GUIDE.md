# Voice Form Widget - Implementation Guide

Complete guide for embedding voice forms on external websites using the widget system.

## Overview

The Voice Form Widget allows you to embed interactive voice-enabled forms on any website. Users can fill out forms using voice input, text input, or a combination of both.

## Features

- **Multiple Embedding Methods**: iframe, React component, or direct HTML
- **Customizable Appearance**: Control colors, position, button text, and icons
- **Voice & Text Input**: Supports both input methods seamlessly
- **Cross-Origin Communication**: Secure messaging between widget and parent page
- **Responsive Design**: Works on desktop and mobile devices
- **Event System**: Listen to form events in your application

## Getting Started

### Step 1: Create a Voice Form

1. Navigate to `/voice-forms` in your dashboard
2. Click "Create Form"
3. Choose a template or start from scratch
4. Configure your fields and settings
5. Save and activate your form

### Step 2: Get Embed Code

1. Open the form in the Voice Form Manager
2. Click the "Embed" button
3. Configure widget appearance:
   - Position (bottom-right, bottom-left, top-right, top-left)
   - Primary color
   - Button text
   - Show/hide icon
4. Copy the generated code

### Step 3: Add to Your Website

Choose your integration method based on your tech stack.

## Integration Methods

### 1. HTML/Iframe (Universal)

**Best for**: Any website, CMS, static sites

```html
<!-- Add before closing </body> tag -->
<iframe 
  src="https://yourdomain.com/embed/voice-form?formId=YOUR_FORM_ID&position=bottom-right&color=3b82f6&buttonText=Contact%20Us"
  style="position: fixed; bottom: 0; right: 0; width: 100%; height: 100%; border: none; pointer-events: none; z-index: 9999;"
  allow="microphone"
></iframe>

<script>
  // Optional: Listen for form submission
  window.addEventListener('message', function(event) {
    if (event.data.type === 'voice-form-submitted') {
      console.log('Form submitted!', event.data);
      // Track with analytics, show thank you message, etc.
    }
  });
</script>
```

**Key Points**:
- `pointer-events: none` allows clicks to pass through to your page
- Widget button has `pointer-events: auto` to capture clicks
- `allow="microphone"` enables voice input functionality
- `z-index: 9999` ensures widget appears above page content

### 2. React Component

**Best for**: React applications

```tsx
import { VoiceFormWidget } from '@/components/VoiceFormWidget';

function App() {
  const handleFormSubmitted = (data: any) => {
    console.log('Form submitted:', data);
    // Your custom logic
  };

  return (
    <div>
      {/* Your app content */}
      
      <VoiceFormWidget
        formId="YOUR_FORM_ID"
        position="bottom-right"
        primaryColor="#3b82f6"
        buttonText="Contact Us"
        buttonIcon={true}
      />
    </div>
  );
}
```

### 3. WordPress

**Best for**: WordPress sites

**Option A: Theme Footer**
1. Go to Appearance → Theme File Editor
2. Open `footer.php`
3. Add the iframe code before `</body>`

**Option B: Custom HTML Block**
1. Edit your page/post
2. Add a "Custom HTML" block
3. Paste the iframe code

**Option C: Plugin Code Snippets**
1. Install "Code Snippets" plugin
2. Create new snippet
3. Add iframe code to footer
4. Activate snippet

### 4. Shopify

```html
<!-- In your theme.liquid file -->
<iframe 
  src="https://yourdomain.com/embed/voice-form?formId=YOUR_FORM_ID"
  style="position: fixed; bottom: 0; right: 0; width: 100%; height: 100%; border: none; pointer-events: none; z-index: 9999;"
  allow="microphone"
></iframe>
```

### 5. Webflow

1. Go to Project Settings → Custom Code
2. Add iframe code to Footer Code
3. Publish your site

### 6. Squarespace

1. Go to Settings → Advanced → Code Injection
2. Add iframe code to Footer
3. Save changes

## Configuration Options

### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `formId` | string | required | Your voice form ID |
| `position` | string | `bottom-right` | Widget position on page |
| `color` | string | `3b82f6` | Primary color (hex without #) |
| `buttonText` | string | `Open Form` | Button label text |
| `buttonIcon` | boolean | `true` | Show/hide message icon |

### Position Options

- `bottom-right` - Bottom right corner (default)
- `bottom-left` - Bottom left corner
- `top-right` - Top right corner
- `top-left` - Top left corner

### Example URLs

```
Basic:
https://yourdomain.com/embed/voice-form?formId=abc-123

Custom appearance:
https://yourdomain.com/embed/voice-form?formId=abc-123&position=bottom-left&color=ff6b6b&buttonText=Get%20Help

No icon:
https://yourdomain.com/embed/voice-form?formId=abc-123&buttonIcon=false
```

## Event System

### Available Events

#### 1. Widget Ready

Fired when the widget is loaded and ready.

```javascript
window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-widget-ready') {
    console.log('Widget ready for form:', event.data.formId);
  }
});
```

#### 2. Form Submitted

Fired when a form is successfully submitted.

```javascript
window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-submitted') {
    const { formId, data } = event.data;
    
    // Example: Track with Google Analytics
    gtag('event', 'form_submit', {
      'form_id': formId,
      'form_name': 'contact_form'
    });
    
    // Example: Show thank you message
    alert('Thank you for your submission!');
    
    // Example: Redirect to thank you page
    window.location.href = '/thank-you';
  }
});
```

### Complete Event Handler Example

```javascript
window.addEventListener('message', function(event) {
  switch(event.data.type) {
    case 'voice-form-widget-ready':
      console.log('✅ Widget loaded');
      break;
      
    case 'voice-form-submitted':
      // Track submission
      if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
          'form_id': event.data.formId
        });
      }
      
      // Show success message
      showNotification('Thank you! We\'ll be in touch soon.');
      
      // Send to your analytics
      fetch('/api/track-submission', {
        method: 'POST',
        body: JSON.stringify({
          formId: event.data.formId,
          timestamp: new Date().toISOString()
        })
      });
      break;
      
    case 'voice-form-opened':
      console.log('📝 Form opened by user');
      break;
      
    case 'voice-form-closed':
      console.log('❌ Form closed by user');
      break;
  }
});
```

## Styling & Customization

### Custom Button Styles

Override default styles with CSS:

```html
<style>
  iframe[src*="voice-form"] {
    /* Custom styles */
  }
</style>
```

### Match Your Brand

Use the color parameter to match your brand:

```html
<!-- Blue theme -->
?color=3b82f6

<!-- Red theme -->
?color=ef4444

<!-- Purple theme -->
?color=8b5cf6

<!-- Green theme -->
?color=10b981
```

### Mobile Optimization

The widget automatically adjusts for mobile devices:
- Button size increases on small screens
- Form modal uses full-screen on mobile
- Touch-friendly input fields
- Voice button optimized for mobile

## Security & Privacy

### Microphone Permissions

- Users must grant microphone permission for voice input
- Permission is requested only when user attempts voice input
- Text input works without any permissions

### Data Handling

- Form submissions go directly to your Supabase database
- Data is encrypted in transit (HTTPS)
- No data is stored in the widget/iframe
- Comply with GDPR/privacy regulations

### Content Security Policy

If your site uses CSP, add these directives:

```html
<meta http-equiv="Content-Security-Policy" 
      content="frame-src https://yourdomain.com; 
               script-src 'self' 'unsafe-inline';">
```

## Troubleshooting

### Widget Not Appearing

**Check:**
1. Form ID is correct
2. Form is active in dashboard
3. iframe code is before `</body>`
4. No CSS conflicts hiding the widget
5. Console for JavaScript errors

### Voice Input Not Working

**Check:**
1. `allow="microphone"` in iframe
2. HTTPS (required for microphone access)
3. Browser supports Web Speech API
4. User granted microphone permission

### Form Not Submitting

**Check:**
1. Required fields are filled
2. Validation rules are met
3. Network requests in DevTools
4. Edge function logs in Supabase

### Styling Issues

**Check:**
1. Z-index conflicts
2. CSS affecting iframe
3. Position conflicts with fixed elements
4. Mobile viewport settings

## Best Practices

### 1. Placement

- **Bottom-right**: Standard for support/contact forms
- **Bottom-left**: If chat widget is on right
- **Top-right**: For important announcements
- **Top-left**: Less common, use sparingly

### 2. Button Text

- Keep it short (2-3 words)
- Action-oriented: "Get Help", "Contact Us", "Book Now"
- Match your brand voice

### 3. Colors

- Use your brand's primary color
- Ensure good contrast with white text
- Test in light and dark backgrounds

### 4. Performance

- Widget loads asynchronously
- Minimal impact on page load time
- Voice models loaded on-demand

### 5. Accessibility

- Widget has keyboard navigation
- Screen reader compatible
- ARIA labels for all buttons
- Focus indicators visible

## Analytics Integration

### Google Analytics

```javascript
window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-submitted') {
    gtag('event', 'form_submit', {
      'event_category': 'Voice Forms',
      'event_label': event.data.formId,
      'value': 1
    });
  }
});
```

### Facebook Pixel

```javascript
window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-submitted') {
    fbq('track', 'Lead', {
      content_name: 'Voice Form Submission',
      content_category: 'Contact'
    });
  }
});
```

### Custom Analytics

```javascript
window.addEventListener('message', function(event) {
  if (event.data.type === 'voice-form-submitted') {
    // Send to your analytics endpoint
    fetch('https://your-analytics.com/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'form_submission',
        formId: event.data.formId,
        timestamp: Date.now(),
        data: event.data.data
      })
    });
  }
});
```

## Advanced Usage

### Programmatic Control

Open the form programmatically:

```javascript
// Send message to widget iframe
const iframe = document.querySelector('iframe[src*="voice-form"]');
iframe.contentWindow.postMessage({
  type: 'open-voice-form'
}, '*');
```

### Conditional Display

Show widget only on certain pages:

```javascript
// Only show on pricing and contact pages
if (window.location.pathname.match(/\/(pricing|contact)/)) {
  // Inject widget
  const iframe = document.createElement('iframe');
  iframe.src = 'https://yourdomain.com/embed/voice-form?formId=abc-123';
  iframe.style = '...';
  document.body.appendChild(iframe);
}
```

### Dynamic Configuration

Change widget config based on user:

```javascript
const userType = getUserType(); // your function
const color = userType === 'premium' ? 'ffd700' : '3b82f6';
const formId = userType === 'premium' ? 'premium-form-id' : 'standard-form-id';

const iframeSrc = `https://yourdomain.com/embed/voice-form?formId=${formId}&color=${color}`;
```

## Testing

### Test Checklist

- [ ] Widget appears in correct position
- [ ] Button opens form modal
- [ ] Voice input works (with microphone permission)
- [ ] Text input works
- [ ] Form submits successfully
- [ ] Required fields are validated
- [ ] Success message displays
- [ ] Events fire correctly
- [ ] Mobile responsive
- [ ] Works in all target browsers

### Browser Compatibility

| Browser | Voice Input | Text Input |
|---------|-------------|------------|
| Chrome | ✅ | ✅ |
| Firefox | ⚠️ Limited | ✅ |
| Safari | ⚠️ Limited | ✅ |
| Edge | ✅ | ✅ |
| Mobile Safari | ⚠️ Limited | ✅ |
| Mobile Chrome | ✅ | ✅ |

⚠️ = Web Speech API support varies

## Support

For issues or questions:
1. Check console for errors
2. Review Supabase edge function logs
3. Test with browser DevTools Network tab
4. Verify form configuration in dashboard

## Next Steps

- [Conditional Logic Guide](./VOICE_FORM_CONDITIONAL_LOGIC.md)
- [Chat Integration Guide](./VOICE_FORM_CHAT_INTEGRATION.md)
- [Analytics Dashboard](./VOICE_FORM_ANALYTICS.md)
