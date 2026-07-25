(function () {
  // TalkWeb Widget - Privacy-Enhanced Implementation
  const WIDGET_VERSION = "2025.02.04.DYNAMIC_THEMING";

  console.log("TALKWEB WIDGET LOADED!", WIDGET_VERSION);
  window.talkWebLoaded = true;

  // Get assistant ID from script tag
  const script = document.currentScript || document.querySelector("script[data-assistant]");
  const assistantId = script?.getAttribute("data-assistant") || "e7fa0f16-ba8e-4277-bd80-70f0aa25cbad";
  const baseUrl = script?.getAttribute("data-base-url") || "https://talkweb.io";

  // Dynamic theming configuration - will be populated from database
  let widgetConfig = {
    businessName: 'Me',
    primaryColor: 'hsl(217, 91%, 60%)',
    accentColor: 'hsl(217, 91%, 50%)',
    textColor: '#ffffff',
    backgroundColor: '#ffffff',
    borderColor: 'rgba(0,0,0,0.1)',
    userBubbleColor: '#6366f1',
    aiBubbleColor: '#f3f4f6',
    gradientEnabled: false,
    shape: 'round',
    buttonSize: 'medium',
    shadowStyle: 'medium',
    borderWidth: 'none',
    animationStyle: 'none',
    loaded: false
  };

  // Supabase URL for fetching assistant config
  const SUPABASE_URL = "https://oujqkygfmyapmrgxmhvt.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91anFreWdmbXlhcG1yZ3htaHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxNzE4NjEsImV4cCI6MjA2Nzc0Nzg2MX0.QIbZhxQTXqPQhNhlLqBVGYtgsq4gpjgE5ZCa3VY7pKg";

  // Fetch assistant configuration for theming
  async function fetchAssistantConfig() {
    try {
      console.log("🎨 Fetching assistant config for theming...");
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/assistants?id=eq.${assistantId}&select=business_name,widget_primary_color,widget_accent_color,widget_text_color,widget_background_color,widget_border_color,widget_user_bubble_color,widget_ai_bubble_color,widget_gradient_enabled,widget_shape,widget_button_size,widget_shadow_style,widget_border_width,widget_animation_style,widget_banner_line1,widget_banner_line2`,
        {
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        console.warn("🎨 Failed to fetch assistant config:", response.status);
        return;
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        const assistant = data[0];
        
        // Update widget config with fetched values
        if (assistant.business_name) {
          widgetConfig.businessName = assistant.business_name;
        }
        if (assistant.widget_primary_color) {
          widgetConfig.primaryColor = assistant.widget_primary_color;
        }
        if (assistant.widget_accent_color) {
          widgetConfig.accentColor = assistant.widget_accent_color;
        }
        if (assistant.widget_text_color) {
          widgetConfig.textColor = assistant.widget_text_color;
        }
        if (assistant.widget_background_color) {
          widgetConfig.backgroundColor = assistant.widget_background_color;
        }
        if (assistant.widget_border_color) {
          widgetConfig.borderColor = assistant.widget_border_color;
        }
        if (assistant.widget_user_bubble_color) {
          widgetConfig.userBubbleColor = assistant.widget_user_bubble_color;
        }
        if (assistant.widget_ai_bubble_color) {
          widgetConfig.aiBubbleColor = assistant.widget_ai_bubble_color;
        }
        if (assistant.widget_gradient_enabled !== null && assistant.widget_gradient_enabled !== undefined) {
          widgetConfig.gradientEnabled = assistant.widget_gradient_enabled;
        }
        if (assistant.widget_shape) {
          widgetConfig.shape = assistant.widget_shape;
        }
        if (assistant.widget_button_size) {
          widgetConfig.buttonSize = assistant.widget_button_size;
        }
        if (assistant.widget_shadow_style) {
          widgetConfig.shadowStyle = assistant.widget_shadow_style;
        }
        if (assistant.widget_border_width) {
          widgetConfig.borderWidth = assistant.widget_border_width;
        }
        if (assistant.widget_animation_style) {
          widgetConfig.animationStyle = assistant.widget_animation_style;
        }
        if (assistant.widget_banner_line1) {
          widgetConfig.bannerLine1 = assistant.widget_banner_line1;
        }
        if (assistant.widget_banner_line2) {
          widgetConfig.bannerLine2 = assistant.widget_banner_line2;
        }
        
        widgetConfig.loaded = true;
        console.log("🎨 Assistant config loaded:", widgetConfig);
        
        // Apply dynamic theming after config is loaded
        applyDynamicTheming();
      }
    } catch (error) {
      console.warn("🎨 Error fetching assistant config:", error);
    }
  }

  // Convert hex color to HSL string for CSS compatibility
  function hexToHsl(hex) {
    if (!hex || hex.startsWith('hsl')) return hex;
    
    // Remove # if present
    hex = hex.replace(/^#/, '');
    
    // Parse hex values
    let r = parseInt(hex.substring(0, 2), 16) / 255;
    let g = parseInt(hex.substring(2, 4), 16) / 255;
    let b = parseInt(hex.substring(4, 6), 16) / 255;
    
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      let d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    
    return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  }

  // Get primary color in HSL format
  function getPrimaryHsl() {
    return hexToHsl(widgetConfig.primaryColor);
  }

  // Get accent color in HSL format  
  function getAccentHsl() {
    return hexToHsl(widgetConfig.accentColor);
  }

  // Helper: get border-radius from shape setting
  function getShapeRadius() {
    switch (widgetConfig.shape) {
      case 'round': return '16px';
      case 'rounded': return '12px';
      case 'square': return '4px';
      default: return '12px';
    }
  }

  // Helper: get box-shadow from shadowStyle setting
  function getShadowStyle() {
    switch (widgetConfig.shadowStyle) {
      case 'none': return 'none';
      case 'subtle': return '0 4px 15px -5px rgba(0, 0, 0, 0.15)';
      case 'medium': return '0 20px 60px -10px rgba(0, 0, 0, 0.3)';
      case 'strong': return '0 25px 80px -10px rgba(0, 0, 0, 0.45)';
      default: return '0 20px 60px -10px rgba(0, 0, 0, 0.3)';
    }
  }

  // Helper: get border width from setting
  function getBorderWidth() {
    switch (widgetConfig.borderWidth) {
      case 'none': return '0';
      case 'thin': return '1px';
      case 'medium': return '2px';
      case 'thick': return '3px';
      default: return '1px';
    }
  }

  // Helper: get button size from setting
  function getButtonSize() {
    switch (widgetConfig.buttonSize) {
      case 'small': return '48px';
      case 'medium': return '64px';
      case 'large': return '80px';
      default: return '64px';
    }
  }

  // Apply dynamic theming to existing widget elements
  function applyDynamicTheming() {
    const primaryHsl = getPrimaryHsl();
    const accentHsl = getAccentHsl();
    const textColor = widgetConfig.textColor;
    
    console.log("🎨 Applying dynamic theming with primary:", primaryHsl, "config:", widgetConfig);
    
    // Update promo text with business name - centered alignment
    const promoText = document.getElementById("talkweb-promo-text");
    if (promoText) {
      const bannerL1 = widgetConfig.bannerLine1 || 'Skip the Scrolling';
      const bannerL2 = widgetConfig.bannerLine2 || 'Use <span style="font-weight: bold; color: #fcd34d;">"Voice"</span>';
      promoText.innerHTML = `${bannerL1}<br>${bannerL2}`;
      promoText.style.background = `linear-gradient(to right, ${primaryHsl}, ${primaryHsl}, ${primaryHsl.replace(')', ', 0.9)')})`;
      promoText.style.color = textColor;
      promoText.style.textAlign = 'center';
    }
    
    // Update mic button with size and shape
    const micButton = document.getElementById("talkweb-mic-button");
    if (micButton) {
      const btnSize = getButtonSize();
      micButton.style.width = btnSize;
      micButton.style.height = btnSize;
      if (widgetConfig.gradientEnabled) {
        micButton.style.background = `linear-gradient(135deg, ${primaryHsl}, ${accentHsl})`;
      } else {
        micButton.style.background = primaryHsl;
      }
      micButton.style.boxShadow = `0 4px 20px ${primaryHsl.replace(')', ', 0.4)')}`;
      micButton.style.borderRadius = widgetConfig.shape === 'square' ? '8px' : '50%';
    }
    
    // Update TalkWeb badge
    const badges = document.querySelectorAll('[style*="animation: fadeBadge"]');
    badges.forEach(badge => {
      badge.style.background = primaryHsl;
    });
    
    // Update minimized bar border
    const minimizedBar = document.getElementById("talkweb-minimized-bar");
    if (minimizedBar) {
      minimizedBar.style.borderColor = primaryHsl;
    }
    
    // Update minimized voice indicator
    const minimizedVoiceIndicator = document.getElementById("talkweb-minimized-voice-indicator");
    if (minimizedVoiceIndicator) {
      minimizedVoiceIndicator.style.background = `linear-gradient(135deg, ${primaryHsl}, ${accentHsl})`;
    }

    // Update chat container with advanced branding
    const chatContainer = document.getElementById("talkweb-chat-container");
    if (chatContainer) {
      chatContainer.style.background = widgetConfig.backgroundColor;
      chatContainer.style.borderRadius = getShapeRadius();
      chatContainer.style.boxShadow = getShadowStyle();
      chatContainer.style.border = `${getBorderWidth()} solid ${widgetConfig.borderColor}`;
    }

    // Update chat header with gradient setting
    const chatHeader = document.querySelector('#talkweb-chat-container > div:first-child');
    if (chatHeader && chatHeader.style.background) {
      if (widgetConfig.gradientEnabled) {
        chatHeader.style.background = `linear-gradient(135deg, ${primaryHsl}, ${accentHsl})`;
      } else {
        chatHeader.style.background = primaryHsl;
      }
    }

    // Apply animation style to widget container
    const widgetContainer = document.getElementById("talkweb-widget-container");
    if (widgetContainer && widgetConfig.animationStyle !== 'none') {
      widgetContainer.classList.remove('talkweb-anim-pulse', 'talkweb-anim-glow', 'talkweb-anim-bounce');
      widgetContainer.classList.add(`talkweb-anim-${widgetConfig.animationStyle}`);
    }
  }

  // STEP 2: Capture parent window's origin for correct navigation
  const parentOrigin = window.location.origin;
  const parentUrl = window.location.href;

  console.log("🌐 STEP 2: Widget loaded on parent page");
  console.log("🌐 STEP 2: Parent Origin:", parentOrigin);
  console.log("🌐 STEP 2: Parent URL:", parentUrl);
  console.log("Assistant ID:", assistantId);
  console.log("Base URL:", baseUrl);

  // Privacy consent management
  const CONSENT_KEY = `talkweb_voice_consent_${assistantId}`;
  const CONSENT_VERSION = "1.0";
  const CONSENT_EXPIRY_DAYS = 30;

  // Check if user has valid consent
  function hasValidConsent() {
    try {
      const stored = localStorage.getItem(CONSENT_KEY);
      if (!stored) return false;

      const consent = JSON.parse(stored);
      const now = new Date().getTime();
      const consentTime = new Date(consent.timestamp).getTime();
      const daysSinceConsent = (now - consentTime) / (1000 * 60 * 60 * 24);

      return consent.granted && consent.version === CONSENT_VERSION && daysSinceConsent < CONSENT_EXPIRY_DAYS;
    } catch (e) {
      console.warn("Error checking consent:", e);
      return false;
    }
  }

  // Store user consent
  function storeConsent(granted) {
    try {
      const consent = {
        granted,
        timestamp: new Date().getTime(),
        version: CONSENT_VERSION,
      };
      localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
      console.log("Consent stored:", granted);
    } catch (e) {
      console.warn("Error storing consent:", e);
    }
  }

  // Global state for voice mode
  let voiceDisabled = false;

  // Create privacy consent modal
  function createConsentModal() {
    const modalId = "talkweb-privacy-consent-modal";

    // Remove existing modal if any
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = modalId;
    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
        box-sizing: border-box;
      " class="talkweb-animate-fade-in">
        
        <div style="
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 480px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px -10px rgba(0, 0, 0, 0.3);
          position: relative;
        " class="talkweb-animate-scale-in">
          
          <!-- Header -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="
              width: 32px;
              height: 32px;
              background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(217, 91%, 50%));
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 16px;
            ">🛡️</div>
            <h3 style="
              margin: 0;
              font-size: 20px;
              font-weight: 600;
              color: #1f2937;
            ">Voice Privacy Consent</h3>
          </div>
          
          <!-- Content -->
          <div style="margin-bottom: 20px;">
            <p style="
              margin: 0 0 16px 0;
              color: #4b5563;
              font-size: 14px;
              line-height: 1.5;
            ">
              This assistant can process your voice to provide a better experience. Here's how your voice data is handled:
            </p>
            
            <div style="
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 16px;
            ">
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                <span style="color: #10b981; font-size: 16px;">✓</span>
                <span style="font-size: 13px; color: #374151;">Real-time processing only - no permanent audio storage</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                <span style="color: #10b981; font-size: 16px;">✓</span>
                <span style="font-size: 13px; color: #374151;">Encrypted transmission and secure processing</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                <span style="color: #10b981; font-size: 16px;">✓</span>
                <span style="font-size: 13px; color: #374151;">Session-based data handling - cleared after conversation</span>
              </div>
              <div style="display: flex; align-items: flex-start; gap: 8px;">
                <span style="color: #10b981; font-size: 16px;">✓</span>
                <span style="font-size: 13px; color: #374151;">No sharing with third parties</span>
              </div>
            </div>

            <div style="
              display: flex;
              align-items: flex-start;
              gap: 12px;
              background: #fef3cd;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 12px;
              margin-bottom: 16px;
            ">
              <span style="color: #d97706; font-size: 16px; margin-top: 2px;">⚠️</span>
              <p style="
                margin: 0;
                font-size: 13px;
                color: #92400e;
                line-height: 1.4;
              ">
                <strong>Microphone Access Required:</strong> Granting consent will allow this website to access your microphone for voice interaction.
              </p>
            </div>
          </div>
          
          <!-- Consent Checkbox -->
          <label style="
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 20px;
            cursor: pointer;
            font-size: 14px;
            color: #374151;
            line-height: 1.4;
          ">
            <input type="checkbox" id="talkweb-consent-checkbox" style="
              margin-top: 2px;
              width: 16px;
              height: 16px;
              cursor: pointer;
            ">
            <span>
              I understand and consent to voice processing as described above. 
              <a href="${baseUrl}/privacy-policy" target="_blank" style="color: hsl(217, 91%, 60%); text-decoration: underline;">View Privacy Policy</a>
            </span>
          </label>
          
          <!-- Action Buttons -->
          <div style="
            display: flex;
            gap: 12px;
            flex-direction: column-reverse;
          ">
            <button id="talkweb-consent-accept" disabled style="
              padding: 12px 24px;
              background: hsl(217, 91%, 60%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              opacity: 0.5;
              transition: all 0.2s;
            ">
              ✓ Accept & Enable Voice
            </button>
            
            <button id="talkweb-consent-decline" style="
              padding: 12px 24px;
              background: #f3f4f6;
              color: #374151;
              border: 1px solid #d1d5db;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            ">
              Use Text Only Mode
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup checkbox behavior
    const checkbox = document.getElementById("talkweb-consent-checkbox");
    const acceptBtn = document.getElementById("talkweb-consent-accept");

    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        acceptBtn.disabled = false;
        acceptBtn.style.opacity = "1";
        acceptBtn.style.cursor = "pointer";
      } else {
        acceptBtn.disabled = true;
        acceptBtn.style.opacity = "0.5";
        acceptBtn.style.cursor = "not-allowed";
      }
    });

    return new Promise((resolve) => {
      // Accept button
      acceptBtn.addEventListener("click", () => {
        if (checkbox.checked) {
          storeConsent(true);
          voiceDisabled = false;
          modal.remove();
          resolve(true);
        }
      });

      // Decline button
      document.getElementById("talkweb-consent-decline").addEventListener("click", () => {
        storeConsent(false);
        voiceDisabled = true;
        modal.remove();
        resolve(false);
      });

      // Close on backdrop click
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          voiceDisabled = true;
          modal.remove();
          resolve(false);
        }
      });
    });
  }

  // Voice recording state
  let isRecording = false;
  let mediaRecorder = null;
  let audioChunks = [];
  let recognitionTimeout = null;

  // NEW: Mute control state
  let isMuted = false;
  let muteButton = null;
  let privacyStatusBadge = null;

  // STEP 2 FIX: Iframe readiness tracking
  let iframeReady = false;
  let muteStateQueue = [];
  let iframeLoadHandlerRegistered = false;

  // NEW: Widget display state
  let widgetState = "closed"; // 'closed', 'minimized', 'open'
  let minimizedBar = null;
  let minimizedVoiceIndicator = null;
  let minimizedMuteButton = null;
  let minimizedStatusText = null;
  let voiceRecognition = null; // Reference to Web Speech API instance

  // Create the widget
  function createWidget() {
    console.log("CREATING WIDGET - VERSION:", WIDGET_VERSION);

    // Force remove any existing widgets
    const existingWidget = document.querySelector("#talkweb-widget-container");
    if (existingWidget) {
      existingWidget.remove();
      console.log("Removed existing widget");
    }

    let showChatWidget = false;

    // Create styles
    const style = document.createElement("style");
    style.textContent = `
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.8); }
        to { opacity: 1; transform: scale(1); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes rotateBadge {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes slideInBrand {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      
      @keyframes pulseRing1 {
        0% { opacity: 0; transform: scale(0.8); }
        40% { opacity: 0.3; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.2); }
      }
      
      @keyframes pulseRing2 {
        0% { opacity: 0; transform: scale(0.8); }
        40% { opacity: 0.2; transform: scale(1); }
        100% { opacity: 0; transform: scale(1.3); }
      }
      
       @keyframes fadeBadge {
         0%, 5% { opacity: 0; transform: translateX(-50%) translateY(5px); }
         10%, 25% { opacity: 1; transform: translateX(-50%) translateY(0); }
         30%, 100% { opacity: 0; transform: translateX(-50%) translateY(5px); }
       }
      
      /* Mute button animations */
      @keyframes shakeMute {
        0%, 100% { transform: translateX(0) scale(1); }
        25% { transform: translateX(-3px) scale(1.05); }
        75% { transform: translateX(3px) scale(1.05); }
      }

      @keyframes slideInFromLeft {
        from { opacity: 0; transform: translateX(-20px) scale(0.8); }
        to { opacity: 1; transform: translateX(0) scale(1); }
      }

      /* Minimized bar animations */
      @keyframes slideUpFromBottom {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }

      /* State classes */
      .talkweb-mute-active {
        background: linear-gradient(135deg, #fee2e2, #fecaca) !important;
        color: #dc2626 !important;
        border-color: #dc2626 !important;
        animation: shakeMute 0.5s ease !important;
      }

      .talkweb-mute-show {
        display: flex !important;
        animation: slideInFromLeft 0.3s ease-out !important;
      }

      .talkweb-mute-hide {
        animation: fadeOut 0.2s ease-out !important;
        opacity: 0 !important;
      }

      .talkweb-animate-slide-up {
        animation: slideUpFromBottom 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      .talkweb-animate-fade-in { animation: fadeIn 0.3s ease-out; }
      .talkweb-animate-scale-in { animation: scaleIn 0.3s ease-out; }
      .talkweb-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

      /* Advanced branding animation styles */
      .talkweb-anim-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      .talkweb-anim-glow #talkweb-mic-button { box-shadow: 0 0 20px 8px rgba(99, 102, 241, 0.5) !important; animation: glowPulse 2s ease-in-out infinite; }
      @keyframes glowPulse {
        0%, 100% { box-shadow: 0 0 15px 5px rgba(99, 102, 241, 0.3); }
        50% { box-shadow: 0 0 30px 12px rgba(99, 102, 241, 0.6); }
      }
      .talkweb-anim-bounce { animation: bounceEntry 1s ease infinite; }
      @keyframes bounceEntry {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }

      /* Mobile Responsive Styles */
      @media (max-width: 640px) {
        /* Optimize header title for mobile */
        .talkweb-header-title {
          font-size: 14px !important;
        }

        /* Hide badge text on mobile, keep only emoji/icon */
        .talkweb-lang-badge span:last-child {
          display: none !important;
        }
        
        .talkweb-live-badge span {
          display: none !important;
        }

        /* Make badges smaller on mobile */
        .talkweb-lang-badge,
        .talkweb-live-badge {
          padding: 4px 6px !important;
          min-width: 28px !important;
          justify-content: center !important;
        }

        /* Ensure buttons are large enough for touch */
        #talkweb-minimize-button,
        #talkweb-close-button {
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
        }
      }
    `;
    document.head.appendChild(style);

    // Create widget container
    const widget = document.createElement("div");
    
    // Get dynamic colors for initial render
    const primaryHsl = getPrimaryHsl();
    const accentHsl = getAccentHsl();
    const textColor = widgetConfig.textColor;
    const businessName = widgetConfig.businessName;
    
    widget.innerHTML = `
      <!-- Main floating widget -->
      <div id="talkweb-widget-container" style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      " class="talkweb-animate-fade-in">
        
        <!-- Promotional text bubble - dynamic business name -->
        <div id="talkweb-promo-text" style="
          background: linear-gradient(to right, ${primaryHsl}, ${primaryHsl}, ${primaryHsl.replace(')', ', 0.9)')});
          color: ${textColor};
          padding: 8px 16px;
          border-radius: 9999px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          border: 1px solid ${primaryHsl.replace(')', ', 0.2)')};
          backdrop-filter: blur(4px);
          text-align: center;
        " class="talkweb-animate-scale-in">
          ${widgetConfig.bannerLine1 || 'Skip the Scrolling'}<br>${widgetConfig.bannerLine2 || 'Use <span style="font-weight: bold; color: #fcd34d;">"Voice"</span>'}
        </div>
        
        <!-- Voice button with pulsing rings -->
        <div style="position: relative; display: flex; align-items: center; justify-content: center;">
          <!-- Pulsing rings around mic button - dynamic color -->
          <div id="talkweb-pulse-ring-1" style="
            position: absolute;
            width: 80px;
            height: 80px;
            border: 2px solid ${primaryHsl};
            border-radius: 50%;
            opacity: 0;
            animation: pulseRing1 4s ease-out infinite;
            z-index: 1;
          "></div>
          <div id="talkweb-pulse-ring-2" style="
            position: absolute;
            width: 90px;
            height: 90px;
            border: 1px solid ${primaryHsl};
            border-radius: 50%;
            opacity: 0;
            animation: pulseRing2 4s ease-out infinite 1s;
            z-index: 1;
          "></div>
          
          <!-- Periodic fading TalkWeb badge - dynamic color -->
          <div id="talkweb-brand-badge" style="
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            background: ${primaryHsl};
            color: ${textColor};
            padding: 3px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 500;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 4;
            animation: fadeBadge 15s ease-in-out infinite;
            opacity: 0;
          ">
            TalkWeb
          </div>
          
          <!-- Small Chat Icon - dynamic color -->
          <div id="talkweb-chat-icon" style="
            position: absolute;
            top: -12px;
            right: -12px;
            width: 22px;
            height: 22px;
            background: linear-gradient(135deg, ${primaryHsl}, ${accentHsl});
            border: 1.5px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            color: ${textColor};
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            z-index: 3;
          ">💬</div>
          
          <!-- Microphone button - dynamic color -->
          <button id="talkweb-mic-button" style="
            width: 64px;
            height: 64px;
            background: linear-gradient(135deg, ${primaryHsl}, ${accentHsl});
            border: none;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 20px ${primaryHsl.replace(')', ', 0.4)')};
            color: ${textColor};
            font-size: 24px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            outline: none;
            position: relative;
            z-index: 2;
          " class="talkweb-pulse">
            🎙️
          </button>
          
          <!-- Privacy Status Badge (shows above buttons when muted) -->
          <div id="talkweb-privacy-status" style="
            position: absolute;
            top: -45px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #fee2e2, #fecaca);
            color: #dc2626;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            box-shadow: 0 4px 15px rgba(220, 38, 38, 0.25);
            border: 2px solid #dc2626;
            display: none;
            z-index: 5;
            animation: fadeIn 0.3s ease-out;
          ">
            <span style="font-size: 14px; margin-right: 6px;">🔇</span>
            <span>Microphone Muted</span>
          </div>

          <!-- Floating Mute Button (NOT USED - kept for legacy compatibility) -->
          <button id="talkweb-floating-mute-button" style="
            width: 52px;
            height: 52px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
            border: 3px solid ${primaryHsl};
            border-radius: 50%;
            display: none;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 4px 20px ${primaryHsl.replace(')', ', 0.3)')};
            color: ${primaryHsl};
            font-size: 22px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: absolute;
            bottom: 6px;
            left: -65px;
            z-index: 2;
            outline: none;
          " title="🔇 Click to mute microphone">
            🎤
          </button>
        </div>
      </div>
      
      <!-- Chat Widget Overlay -->
      <div id="talkweb-chat-overlay" style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.1);
        z-index: 9999999;
        display: none;
      " class="talkweb-animate-fade-in">
        
        <!-- Chat Widget Container -->
        <div id="talkweb-chat-container">
          <!-- Header - dynamic color -->
          <div id="talkweb-chat-header" style="
            position: relative;
            background: linear-gradient(to right, ${primaryHsl.replace(')', ', 0.05)')}, ${accentHsl.replace(')', ', 0.05)')});
            padding: 12px 16px;
            border-bottom: 1px solid rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            flex-wrap: nowrap;
          ">
            <!-- Tiny vertical TalkWeb link in bottom-left corner -->
            <a href="https://talkweb.io" target="_blank" style="
              position: absolute;
              bottom: 4px;
              left: 4px;
              font-size: 5px;
              color: ${primaryHsl};
              text-decoration: underline;
              cursor: pointer;
              transition: color 0.2s ease;
              writing-mode: vertical-rl;
              text-orientation: mixed;
              z-index: 10;
            ">TalkWeb</a>
            
            <div style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; overflow: hidden;">
              <!-- Main header content -->
              <div style="
                display: flex; 
                align-items: center; 
                gap: 8px;
                animation: slideInBrand 0.6s ease-out;
                flex-shrink: 1;
                min-width: 0;
              ">
                <div style="
                  display: flex;
                  flex-direction: column;
                  align-items: flex-start;
                  gap: 0;
                  line-height: 1.1;
                  margin: 0;
                ">
                  <span style="
                    font-weight: 600; 
                    font-size: 14px; 
                    margin: 0; 
                    color: #1f2937;
                  " class="talkweb-header-title">Voice &</span>
                  <span style="
                    font-weight: 600; 
                    font-size: 14px; 
                    margin: 0; 
                    color: #1f2937;
                  " class="talkweb-header-title">Chat</span>
                  <span style="
                    font-weight: 600; 
                    font-size: 14px; 
                    margin: 0; 
                    color: #1f2937;
                  " class="talkweb-header-title">Assistant</span>
                </div>
              </div>
              
              <!-- Multi-Language Indicator -->
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: rgba(59, 130, 246, 0.1);
                color: #2563eb;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 500;
                border: 1px solid rgba(59, 130, 246, 0.2);
                animation: slideInBrand 0.8s ease-out 0.2s both;
                flex-shrink: 0;
              " class="talkweb-lang-badge">
                <span style="font-size: 12px;">🌍</span>
                <span style="white-space: nowrap;">Any Language</span>
              </div>
              
              <div style="
                display: flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                background: rgba(34, 197, 94, 0.1);
                color: #059669;
                border-radius: 9999px;
                font-size: 11px;
                font-weight: 500;
                flex-shrink: 0;
              " class="talkweb-live-badge">
                <div style="width: 6px; height: 6px; background: #10b981; border-radius: 50%;" class="talkweb-pulse"></div>
                <span>Live</span>
              </div>
            </div>
            
            <!-- Control Buttons -->
            <div style="display: flex; gap: 6px; flex-shrink: 0;">
              <!-- Minimize Button -->
              <button id="talkweb-minimize-button" style="
                width: 36px;
                height: 36px;
                min-width: 36px;
                border: none;
                background: rgba(59, 130, 246, 0.1);
                color: #2563eb;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                font-weight: bold;
                transition: all 0.2s;
                flex-shrink: 0;
              " title="Minimize - Keep listening in background">−</button>
              
              <!-- Close Button (End Conversation) -->
              <button id="talkweb-close-button" style="
                width: 36px;
                height: 36px;
                min-width: 36px;
                border: none;
                background: rgba(239, 68, 68, 0.1);
                color: #dc2626;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 22px;
                font-weight: bold;
                transition: all 0.2s;
                flex-shrink: 0;
              " title="End conversation and close">×</button>
            </div>
          </div>
          
          <!-- Iframe Container -->
          <iframe 
            id="talkweb-iframe"
            src=""
            style="
              width: 100%;
              height: calc(100% - 65px);
              border: none;
            "
            frameborder="0"
            allow="microphone *; camera *; autoplay"
          ></iframe>
        </div>
      </div>
      
      <!-- Minimized Widget Bar - dynamic color -->
      <div id="talkweb-minimized-bar" style="
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 320px;
        height: 60px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
        border-radius: 30px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        border: 2px solid ${primaryHsl};
        z-index: 9999998;
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 0 16px;
        cursor: pointer;
        transition: all 0.3s ease;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      " class="talkweb-animate-slide-up">
        
        <!-- Left: Status indicator -->
        <div style="display: flex; align-items: center; gap: 12px;">
          <div id="talkweb-minimized-voice-indicator" style="
            width: 32px;
            height: 32px;
            background: linear-gradient(135deg, ${primaryHsl}, ${accentHsl});
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
          " class="talkweb-pulse">🎤</div>
          
          <div id="talkweb-minimized-status" style="
            font-size: 14px;
            font-weight: 600;
            color: #1f2937;
          ">Listening...</div>
        </div>
        
        <!-- Right: Control buttons -->
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Expand button - dynamic color -->
          <button id="talkweb-expand-button" style="
            width: 36px;
            height: 36px;
            background: ${primaryHsl.replace(')', ', 0.1)')};
            border: 2px solid ${primaryHsl};
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          " title="Expand chat" onclick="event.stopPropagation();">↗</button>
          
          <!-- End conversation -->
          <button id="talkweb-minimized-close-button" style="
            width: 36px;
            height: 36px;
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid #dc2626;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            color: #dc2626;
            transition: all 0.2s;
          " title="End conversation" onclick="event.stopPropagation();">×</button>
        </div>
      </div>
    `;

    document.body.appendChild(widget);

    // Add event listeners
    const micButton = document.getElementById("talkweb-mic-button");
    const chatOverlay = document.getElementById("talkweb-chat-overlay");
    const closeButton = document.getElementById("talkweb-close-button");
    const promoText = document.getElementById("talkweb-promo-text");
    const widgetContainer = document.getElementById("talkweb-widget-container");
    const chatContainer = document.getElementById("talkweb-chat-container");
    const chatIframe = document.getElementById("talkweb-iframe");

    if (chatIframe && !iframeLoadHandlerRegistered) {
      chatIframe.addEventListener("load", handleIframeLoad);
      iframeLoadHandlerRegistered = true;
    }

    // Get privacy status badge
    privacyStatusBadge = document.getElementById("talkweb-privacy-status");

    // Get minimized widget references
    minimizedBar = document.getElementById("talkweb-minimized-bar");
    minimizedVoiceIndicator = document.getElementById("talkweb-minimized-voice-indicator");
    minimizedStatusText = document.getElementById("talkweb-minimized-status");

    const minimizeButton = document.getElementById("talkweb-minimize-button");
    const expandButton = document.getElementById("talkweb-expand-button");
    const minimizedCloseButton = document.getElementById("talkweb-minimized-close-button");

    console.log("Widget elements initialized:", {
      muteButton: !!muteButton,
      privacyStatus: !!privacyStatusBadge,
      minimizedBar: !!minimizedBar,
      minimizedMute: !!minimizedMuteButton,
    });

    // Setup iframe target origin for secure messaging
    const iframeTargetOrigin = (() => {
      try {
        const normalizedBase = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl.replace(/^\/+/, "")}`;
        return new URL(normalizedBase).origin;
      } catch (error) {
        console.warn("WIDGET: Unable to derive iframe origin from baseUrl:", baseUrl, error);
        return "*";
      }
    })();

    // Mic button background states - will use dynamic colors via function
    const getActiveMicBackground = () => `linear-gradient(135deg, ${getPrimaryHsl()}, ${getAccentHsl()})`;
    const RECORDING_MIC_BACKGROUND = "linear-gradient(135deg, #ef4444, #dc2626)";

    function sendMuteStateToIframe(payload, reason = "direct send") {
      const iframe = document.getElementById("talkweb-iframe");
      if (!iframe || !iframe.contentWindow) {
        console.warn(`WIDGET: Cannot deliver mute state (${reason}) - iframe not ready`);
        return false;
      }

      try {
        iframe.contentWindow.postMessage(payload, iframeTargetOrigin);
        console.log(`🎛️ WIDGET: Sent talkweb_mute_state message - muted: ${payload.muted} (${reason})`);
        return true;
      } catch (error) {
        console.error("WIDGET: Failed to notify iframe about mute state:", error);
        return false;
      }
    }

    function flushMuteStateQueue(reason) {
      if (!muteStateQueue.length) {
        console.log(`📭 WIDGET: No queued mute state to flush (${reason})`);
        return;
      }

      const payload = muteStateQueue[muteStateQueue.length - 1];
      muteStateQueue = [];

      if (!sendMuteStateToIframe(payload, `flush: ${reason}`)) {
        // If delivery still fails, keep the latest payload queued
        muteStateQueue = [payload];
      }
    }

    function markIframeReady(reason) {
      if (!iframeReady) {
        console.log(`✅ WIDGET: Iframe marked ready (${reason})`);
      }
      iframeReady = true;
      flushMuteStateQueue(reason);
    }

    function handleIframeLoad() {
      markIframeReady("load event");
    }

    // Function to notify iframe of mute state changes
    function notifyIframeMuteState(muted, options = {}) {
      const messagePayload = {
        type: "talkweb_mute_state",
        muted: muted,
        assistantId: assistantId,
        fromMinimized: Boolean(options.fromMinimized),
      };

      // DON'T try to send if iframe not ready
      if (!iframeReady) {
        console.log(`📦 WIDGET: Iframe not ready - queueing mute state: ${muted}`);
        muteStateQueue = [messagePayload];
        return; // EARLY RETURN - don't attempt send
      }

      // Only send if iframe is confirmed ready
      const delivered = sendMuteStateToIframe(messagePayload);
      if (!delivered) {
        console.warn("WIDGET: Mute state delivery failed - queueing for retry");
        muteStateQueue = [messagePayload];
      }
    }

    // Function to update mute button UI
    function updateMuteButtonUI() {
      if (!muteButton) return;

      const muteIcon = muteButton.querySelector("svg");
      if (!muteIcon) return;

      if (isMuted) {
        // Show muted state (mic off)
        muteIcon.innerHTML = `
          <path d="M2 10v3a10 10 0 0 0 9 9.95V20h-4v2h10v-2h-4v-2.05a10 10 0 0 0 9-9.95v-3h-2v3a8 8 0 0 1-16 0v-3H2zm10-8a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2"/>
        `;
        muteButton.style.color = "#ef4444";
      } else {
        // Show unmuted state (mic on)
        muteIcon.innerHTML = `
          <path d="M12 2a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
          <path d="M19 10v3a7 7 0 0 1-14 0v-3"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        `;
        muteButton.style.color = "#3b82f6";
      }
    }

    // Mobile detection and responsive styling
    const isMobile = window.innerWidth <= 768;

    // Apply responsive styling to chat container
    const _bg = widgetConfig.backgroundColor || 'white';
    const _br = getShapeRadius();
    const _bs = getShadowStyle();
    const _bw = getBorderWidth();
    const _bc = widgetConfig.borderColor || 'rgba(0,0,0,0.1)';

    if (isMobile) {
      chatContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 67.5vw;
        height: 67.5vh;
        max-width: 350px;
        max-height: 500px;
        background: ${_bg};
        border-radius: ${_br};
        box-shadow: ${_bs};
        overflow: hidden;
        border: ${_bw} solid ${_bc};
        transform: none;
        top: auto;
        left: auto;
      `;
    } else {
      chatContainer.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: min(90vw, 400px);
        height: min(90vh, 600px);
        background: ${_bg};
        border-radius: ${_br};
        box-shadow: ${_bs};
        overflow: hidden;
        border: ${_bw} solid ${_bc};
        transform: none;
        top: auto;
        left: auto;
      `;
    }

    // Voice recording state
    let voiceRecognition = null;
    let isRecording = false;
    let pendingVoiceStartTimeout = null;
    let wasRecordingBeforeMute = false;

    // Voice recording functions
    function startVoiceRecording() {
      if (isMuted) {
        console.log("🎤 Voice recording start skipped - widget is muted");
        return;
      }

      if (isRecording) {
        console.log("🎤 Voice recording already active - skipping start");
        return;
      }

      if (voiceDisabled) {
        console.log("🎤 Voice recording start skipped - voice mode disabled");
        return;
      }

      if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
        console.error("Speech recognition not supported");
        return;
      }

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      voiceRecognition = new SpeechRecognition();

      voiceRecognition.continuous = false;
      voiceRecognition.interimResults = true;
      voiceRecognition.lang = "en-US";

      voiceRecognition.onstart = () => {
        console.log("🎤 Voice recording started");
        isRecording = true;
        micButton.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
        micButton.innerHTML = "🔴";
      };

      voiceRecognition.onresult = (event) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript;
        const isFinal = event.results[lastResultIndex].isFinal;

        console.log("🎤 Transcript (final:", isFinal, "):", transcript);

        // Send transcript to chat iframe
        const chatFrame = chatOverlay.querySelector("iframe");
        if (chatFrame && chatFrame.contentWindow) {
          chatFrame.contentWindow.postMessage(
            {
              type: "voice_transcript",
              transcript: transcript,
              isFinal: isFinal,
            },
            "*",
          );
        }
      };

      voiceRecognition.onerror = (event) => {
        console.error("🎤 Speech recognition error:", event.error);
        stopVoiceRecording();
      };

      voiceRecognition.onend = () => {
        console.log("🎤 Voice recording ended");
        stopVoiceRecording();
      };

      try {
        voiceRecognition.start();
      } catch (error) {
        console.error("🎤 Error starting recognition:", error);
        stopVoiceRecording();
      }
    }

    function stopVoiceRecording() {
      if (voiceRecognition) {
        try {
          voiceRecognition.stop();
        } catch (e) {}
        voiceRecognition = null;
      }
      isRecording = false;
      if (pendingVoiceStartTimeout) {
        clearTimeout(pendingVoiceStartTimeout);
        pendingVoiceStartTimeout = null;
      }
      micButton.style.background = `linear-gradient(135deg, ${getPrimaryHsl()}, ${getAccentHsl()})`;
      micButton.innerHTML = "🎙️";
    }

    function scheduleVoiceRecordingStart(delay = 500) {
      if (pendingVoiceStartTimeout) {
        clearTimeout(pendingVoiceStartTimeout);
      }

      pendingVoiceStartTimeout = setTimeout(() => {
        pendingVoiceStartTimeout = null;

        if (voiceDisabled) {
          console.log("🎤 Voice start skipped - voice mode disabled");
          return;
        }

        if (isMuted) {
          console.log("🎤 Voice start skipped - widget currently muted");
          return;
        }

        startVoiceRecording();
      }, delay);
    }

    // Open chat widget with consent check
    micButton.addEventListener("click", async () => {
      console.log("Mic button clicked - checking consent...");

      // If already recording, stop it
      if (isRecording) {
        stopVoiceRecording();

        // Hide mute button when stopping voice
        if (muteButton) {
          muteButton.classList.add("talkweb-mute-hide");
          setTimeout(() => {
            muteButton.style.display = "none";
            muteButton.classList.remove("talkweb-mute-hide", "talkweb-mute-active");
          }, 200);
        }

        // Hide privacy status
        if (privacyStatusBadge) {
          privacyStatusBadge.style.display = "none";
        }

        // Reset mute state
        isMuted = false;

        return;
      }

      // Pre-launch consent modal disabled — in-widget VoiceConsentOverlay is the sole consent gate.
      let consentGranted = true;
      try { storeConsent(true); } catch (e) {}

      // Update iframe URL based on consent
      const iframe = document.getElementById("talkweb-iframe");
      let iframeSrc = `${baseUrl}/preview/${assistantId}?embedded=true&chat=true`;

      // STEP 2: Pass parent origin to iframe for correct navigation
      iframeSrc += `&parentOrigin=${encodeURIComponent(parentOrigin)}`;
      console.log("🌐 STEP 2: Passing parent origin to iframe:", parentOrigin);

      if (voiceDisabled || !consentGranted) {
        iframeSrc += "&voiceDisabled=true";
        console.log("Opening chat in text-only mode");
      } else {
        iframeSrc += "&voiceEnabled=true";
        console.log("Opening chat with voice enabled");

        // Show mute button when voice enabled
        if (muteButton) {
          muteButton.style.display = "flex";
          muteButton.classList.add("talkweb-mute-show");
          console.log("✅ Mute button shown");
        }

        // Start voice recording when chat opens with voice enabled
        scheduleVoiceRecordingStart();
      }

      // STEP 5 FIX: Reset iframe ready state before loading new source
      iframeReady = false;
      muteStateQueue = [];
      console.log("🔄 WIDGET: Resetting iframeReady before loading new iframe source");

      // Queue the desired mute state so it is delivered as soon as the iframe is ready
      const initialMuteState = voiceDisabled || !consentGranted || isMuted;
      console.log(
        `🔇 WIDGET: Queueing initial mute state for iframe load -> ${initialMuteState ? "muted" : "unmuted"}`,
      );
      notifyIframeMuteState(initialMuteState, {
        fromMinimized: widgetState === "minimized",
      });
      // CRITICAL FIX: Attach onload handler BEFORE setting src to prevent race condition
      // If iframe loads from cache, load event fires immediately and we'd miss it
      iframe.onload = () => {
        console.log("✅ IFRAME LOADED - Now sending mute state");

        // STEP 2 FIX: Mark iframe as ready
        iframeReady = true;

        if (voiceDisabled || !consentGranted) {
          // Voice is disabled, notify iframe it's muted
          console.log("🔇 WIDGET: Notifying iframe - voice disabled (muted)");
          notifyIframeMuteState(true);
        } else {
          // Voice is enabled, send current mute state
          console.log(`🔇 WIDGET: Notifying iframe on open - current mute state: ${isMuted}`);
          notifyIframeMuteState(isMuted);
        }
      }; // ← CRITICAL: Close the onload handler here

      // Set iframe source AFTER attaching onload handler
      iframe.src = iframeSrc;

      // Show chat widget
      console.log("Opening TalkWeb chat widget");
      chatOverlay.style.display = "block";
      widgetContainer.style.display = "none";
      showChatWidget = true;
      widgetState = "open";

      // STEP 4: Start mute monitoring when chat opens
      startMuteMonitoring();

      // Update promo text based on voice status
      if (voiceDisabled) {
        promoText.innerHTML =
          'Text Chat Mode<br><span style="font-weight: bold; color: #fcd34d;">Ready to Help!</span>';
        // Remove mic emoji from button and replace with chat
        micButton.innerHTML = "💬";
      }
    });

    // ==============================================
    // STATE MANAGEMENT FUNCTIONS
    // ==============================================

    function applyMuteState({ fromMinimized = false } = {}) {
      if (isMuted) {
        const hadPendingStart = Boolean(pendingVoiceStartTimeout);
        const hasActiveRecognition = Boolean(voiceRecognition);
        wasRecordingBeforeMute = isRecording || hadPendingStart || hasActiveRecognition;

        if (pendingVoiceStartTimeout) {
          clearTimeout(pendingVoiceStartTimeout);
          pendingVoiceStartTimeout = null;
        }

        if (hasActiveRecognition || isRecording) {
          console.log("🔇 Stopping voice recording immediately due to mute");
          stopVoiceRecording();
        }
      } else {
        const shouldResumeRecording = wasRecordingBeforeMute && !isRecording;
        wasRecordingBeforeMute = false;

        if (shouldResumeRecording) {
          console.log("🎤 Resuming voice recording after unmute");
          scheduleVoiceRecordingStart(0);
        }
      }

      notifyIframeMuteState(isMuted, { fromMinimized });
    }

    // Toggle mute (for full view mute button)
    function toggleMute() {
      console.log("🔇 toggleMute called - current state:", {
        isMuted,
        iframeReady,
        muteButton: !!muteButton,
        muteButtonDisplay: muteButton?.style.display,
      });

      isMuted = !isMuted;

      // WHOLISTIC FIX: Directly control iframe audio and microphone
      const iframe = chatOverlay?.querySelector("iframe");
      if (iframe?.contentWindow) {
        try {
          // 1. Mute/unmute ALL audio elements in iframe
          const iframeDoc = iframe.contentWindow.document;
          const audioElements = iframeDoc.querySelectorAll("audio");
          audioElements.forEach((audio) => {
            audio.muted = isMuted;
            if (isMuted) {
              audio.pause();
              audio.volume = 0;
            } else {
              audio.volume = 1;
            }
          });

          // 2. Stop/start microphone directly
          if (isMuted && iframe.contentWindow.navigator.mediaDevices) {
            // Stop all media streams
            iframe.contentWindow.navigator.mediaDevices.getUserMedia({ audio: false }).catch(() => {}); // Ignore errors
          }

          console.log(`🔇 DIRECT CONTROL: Audio elements ${isMuted ? "MUTED" : "UNMUTED"}`);
        } catch (error) {
          console.warn("Could not directly control iframe audio (cross-origin?):", error);
        }

        // Send postMessage as cross-origin safe fallback ONLY if iframe ready
        if (iframeReady) {
          try {
            iframe.contentWindow.postMessage(
              {
                type: "widget_force_mute",
                muted: isMuted,
                timestamp: Date.now(),
                priority: "immediate",
              },
              "*",
            );
            console.log(`🔇 FORCE MUTE MESSAGE SENT: ${isMuted ? "MUTED" : "UNMUTED"}`);
          } catch (error) {
            console.warn("Could not send force mute message:", error);
          }
        } else {
          console.log("⏳ Iframe not ready - mute will apply when iframe loads");
        }
      }

      applyMuteState();
      console.log(`🔇 WIDGET: Mute toggled to ${isMuted ? "MUTED ❌" : "UNMUTED ✅"}`);

      if (isMuted) {
        // === MUTE ACTIVATED ===
        muteButton.textContent = "🔇";
        muteButton.classList.add("talkweb-mute-active");
        muteButton.title = "🎤 Click to unmute microphone";

        // Show privacy status badge
        if (privacyStatusBadge) {
          privacyStatusBadge.style.display = "flex";
        }

        // Dim mic button
        micButton.style.opacity = "0.6";
        micButton.style.filter = "grayscale(50%)";
      } else {
        // === MUTE DEACTIVATED ===
        muteButton.textContent = "🎤";
        muteButton.classList.remove("talkweb-mute-active");
        muteButton.title = "🔇 Click to mute microphone";

        // Hide privacy status badge
        if (privacyStatusBadge) {
          privacyStatusBadge.style.display = "none";
        }

        // Restore mic button
        micButton.style.opacity = "1";
        micButton.style.filter = "none";
      }

      updateMuteButtonUI();
      updateMinimizedMuteButton();
    }

    // ============= STEP 4: MUTE MONITORING =============
    // Monitor and enforce mute state continuously
    let muteMonitorInterval = null;

    function startMuteMonitoring() {
      if (muteMonitorInterval) clearInterval(muteMonitorInterval);

      console.log("🔍 Starting mute monitoring (checks every 500ms)");

      muteMonitorInterval = setInterval(() => {
        if (isMuted) {
          const iframe = chatOverlay?.querySelector("iframe");
          if (iframe?.contentWindow) {
            // Enforce mute state every 500ms
            try {
              iframe.contentWindow.postMessage(
                {
                  type: "widget_force_mute",
                  muted: true,
                  timestamp: Date.now(),
                  enforcement: true,
                },
                "*",
              );
              console.log("🔍 Enforced mute state via monitoring");
            } catch (error) {
              console.warn("Could not enforce mute via monitoring:", error);
            }
          }
        }
      }, 500);
    }

    function stopMuteMonitoring() {
      if (muteMonitorInterval) {
        clearInterval(muteMonitorInterval);
        muteMonitorInterval = null;
        console.log("🛑 Stopped mute monitoring");
      }
    }

    // Toggle mute from minimized bar
    function toggleMinimizedMute() {
      isMuted = !isMuted;
      console.log(`🔇 WIDGET: Minimized mute toggled to ${isMuted ? "MUTED ❌" : "UNMUTED ✅"}`);

      if (isMuted) {
        minimizedStatusText.textContent = "Muted";
        minimizedVoiceIndicator.classList.remove("talkweb-pulse");
        minimizedVoiceIndicator.textContent = "🔇";
      } else {
        minimizedStatusText.textContent = "Listening...";
        minimizedVoiceIndicator.classList.add("talkweb-pulse");
        minimizedVoiceIndicator.textContent = "🎤";
      }

      applyMuteState({ fromMinimized: true });

      updateMinimizedMuteButton();
    }

    // Update minimized mute button appearance
    function updateMinimizedMuteButton() {
      if (!minimizedMuteButton) return;

      if (isMuted) {
        minimizedMuteButton.textContent = "🔇";
        minimizedMuteButton.style.background = "rgba(239, 68, 68, 0.1)";
        minimizedMuteButton.style.borderColor = "#dc2626";
        minimizedMuteButton.title = "Unmute microphone";
      } else {
        minimizedMuteButton.textContent = "🎤";
        minimizedMuteButton.style.background = `${getPrimaryHsl().replace(')', ', 0.1)')}`;
        minimizedMuteButton.style.borderColor = getPrimaryHsl();
        minimizedMuteButton.title = "Mute microphone";
      }
    }

    // Minimize chat (collapse to compact bar)
    function minimizeChat() {
      console.log("📦 Minimizing chat - keeping voice active");
      widgetState = "minimized";

      // Hide full chat
      chatOverlay.style.display = "none";

      // Show minimized bar
      minimizedBar.style.display = "flex";

      // Voice continues - DO NOT STOP
      console.log("🎤 Voice remains active in minimized mode");

      // Update minimized status
      if (isRecording) {
        minimizedVoiceIndicator.classList.add("talkweb-pulse");
        minimizedStatusText.textContent = isMuted ? "Muted" : "Listening...";
      }

      // Sync mute button state
      updateMinimizedMuteButton();

      // Send minimize message to iframe
      const iframe = chatOverlay.querySelector("iframe");
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "widget_minimize",
            keepVoiceActive: true,
          },
          "*",
        );
      }
    }

    // Expand chat (open from minimized)
    function expandChat() {
      console.log("📤 Expanding chat from minimized state");
      widgetState = "open";

      // Hide minimized bar
      minimizedBar.style.display = "none";

      // Show full chat
      chatOverlay.style.display = "block";

      // Voice continues without interruption
      console.log("🎤 Voice continues in expanded mode");

      // Send expand message to iframe
      const iframe = chatOverlay.querySelector("iframe");
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          {
            type: "widget_expand",
            restoreView: true,
          },
          "*",
        );
      }
    }

    // Close chat widget
    // Close chat (fully end conversation)
    const closeChat = () => {
      console.log("❌ Closing chat - ending conversation");
      widgetState = "closed";

      // STEP 4: Stop mute monitoring when chat closes
      stopMuteMonitoring();

      // Stop voice recording
      if (isRecording) {
        stopVoiceRecording();
      }

      if (pendingVoiceStartTimeout) {
        clearTimeout(pendingVoiceStartTimeout);
        pendingVoiceStartTimeout = null;
      }

      wasRecordingBeforeMute = false;

      // Hide all widget components
      chatOverlay.style.display = "none";
      minimizedBar.style.display = "none";
      widgetContainer.style.display = "flex";

      // Reset mute state
      isMuted = false;
      if (muteButton) {
        muteButton.style.display = "none";
        muteButton.classList.remove("talkweb-mute-show", "talkweb-mute-active");
      }
      if (privacyStatusBadge) {
        privacyStatusBadge.style.display = "none";
      }

      // STEP 2 FIX: Reset iframe ready state
      iframeReady = false;
      muteStateQueue = [];

      // Restore mic button
      micButton.style.opacity = "1";
      micButton.style.filter = "none";

      // Notify iframe about mute and close
      console.log("🔇 WIDGET: Notifying iframe - closing (muted)");
      notifyIframeMuteState(true);

      // Send close message to iframe
      const iframe = chatOverlay.querySelector("iframe");
      if (iframe?.contentWindow) {
        console.log("Sending close_widget message to iframe");
        iframe.contentWindow.postMessage(
          {
            type: "close_widget",
            endSession: true,
          },
          "*",
        );
      }

      showChatWidget = false;
    };

    // Close button (full close)
    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      closeChat();
    });

    // Minimize button
    if (minimizeButton) {
      minimizeButton.addEventListener("click", (e) => {
        e.stopPropagation();
        minimizeChat();
      });
    }

    // Minimized bar click (expand)
    if (minimizedBar) {
      minimizedBar.addEventListener("click", () => {
        expandChat();
      });
    }

    // Minimized mute button
    if (minimizedMuteButton) {
      console.log("🔇 Attaching click listener to minimized mute button");
      minimizedMuteButton.addEventListener("click", (e) => {
        console.log("🔇 ========== MINIMIZED MUTE BUTTON CLICKED ==========");
        console.log("🔇 Event:", e);
        console.log("🔇 Current mute state:", isMuted);
        console.log("🔇 Iframe ready:", iframeReady);
        e.stopPropagation();
        toggleMinimizedMute();
      });
    }

    // Minimized expand button
    if (expandButton) {
      expandButton.addEventListener("click", (e) => {
        e.stopPropagation();
        expandChat();
      });
    }

    // Minimized close button
    if (minimizedCloseButton) {
      minimizedCloseButton.addEventListener("click", (e) => {
        e.stopPropagation();
        closeChat();
      });
    }

    // Full view mute button
    if (muteButton) {
      console.log("🔇 Attaching click listener to main mute button");
      muteButton.addEventListener("click", (e) => {
        console.log("🔇 ========== MUTE BUTTON CLICKED ==========");
        console.log("🔇 Event:", e);
        console.log("🔇 Target:", e.target);
        console.log("🔇 Current mute state:", isMuted);
        console.log("🔇 Iframe ready:", iframeReady);
        e.stopPropagation();
        toggleMute();
      });

      // Hover effects
      muteButton.addEventListener("mouseenter", () => {
        const scale = 1.1;
        const shadow = isMuted ? "0 6px 25px rgba(220, 38, 38, 0.4)" : "0 6px 25px rgba(59, 130, 246, 0.4)";
        muteButton.style.transform = `scale(${scale})`;
        muteButton.style.boxShadow = shadow;
      });

      muteButton.addEventListener("mouseleave", () => {
        muteButton.style.transform = "scale(1)";
      });
    }

    // Close overlay on background click - minimize instead of closing
    chatOverlay.addEventListener("click", (e) => {
      if (e.target === chatOverlay) {
        minimizeChat();
      }
    });

    // Mic button hover effects - use dynamic primary color
    micButton.addEventListener("mouseenter", () => {
      micButton.style.transform = "scale(1.1)";
      const primaryHsl = getPrimaryHsl();
      micButton.style.boxShadow = `0 6px 25px ${primaryHsl.replace(')', ', 0.5)')}`;
    });

    micButton.addEventListener("mouseleave", () => {
      micButton.style.transform = "scale(1)";
      const primaryHsl = getPrimaryHsl();
      micButton.style.boxShadow = `0 4px 20px ${primaryHsl.replace(')', ', 0.4)')}`;
    });

    // Close button hover effects
    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.background = "rgba(239, 68, 68, 0.2)";
    });

    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.background = "rgba(239, 68, 68, 0.1)";
    });

    // Keyboard shortcut: Press 'M' to toggle mute
    document.addEventListener("keydown", (e) => {
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
          return; // Don't trigger when typing
        }

        // Check if voice is active (either open or minimized)
        if (widgetState === "open" && muteButton?.style.display === "flex") {
          e.preventDefault();
          toggleMute();
          console.log("⌨️ Keyboard shortcut toggled mute (full view)");
        } else if (widgetState === "minimized" && minimizedBar?.style.display === "flex") {
          e.preventDefault();
          toggleMinimizedMute();
          console.log("⌨️ Keyboard shortcut toggled mute (minimized)");
        }
      }
    });

    // Add transcript event handling
    window.addEventListener("message", (event) => {
      // Security check - only accept messages from trusted origins
      const trustedOrigins = [
        baseUrl,
        "https://talkweb.io",
        "https://www.talkweb.io",
        window.location.origin,
        iframeTargetOrigin,
      ];

      if (!trustedOrigins.includes(event.origin)) {
        console.debug("WIDGET: Ignoring message from untrusted origin:", event.origin);
        return;
      }

      console.log("WIDGET: Received message from iframe:", event.data);

      // Handle transcript events from the embedded chat interface
      if (event.data && event.data.type) {
        switch (event.data.type) {
          case "user_transcript":
            console.log("WIDGET: User transcript received:", event.data.transcript);
            // Forward to parent window for external listeners
            if (window.parent !== window) {
              window.parent.postMessage(
                {
                  type: "talkweb_user_transcript",
                  transcript: event.data.transcript,
                  assistantId: assistantId,
                  timestamp: Date.now(),
                },
                "*",
              );
              console.log("WIDGET: Forwarded user transcript to parent window");
            }
            break;

          case "ai_transcript":
            console.log("WIDGET: AI transcript received:", event.data.transcript);
            // Forward to parent window for external listeners
            if (window.parent !== window) {
              window.parent.postMessage(
                {
                  type: "talkweb_ai_transcript",
                  transcript: event.data.transcript,
                  assistantId: assistantId,
                  timestamp: Date.now(),
                },
                "*",
              );
              console.log("WIDGET: Forwarded AI transcript to parent window");
            }
            break;

          case "voice_session_started":
            console.log("WIDGET: Voice session started - showing mute button");
            markIframeReady("voice_session_started message");

            // Show mute button in expanded view
            if (muteButton) {
              console.log("🔍 Before showing - muteButton:", {
                element: muteButton,
                id: muteButton.id,
                currentDisplay: muteButton.style.display,
                classList: Array.from(muteButton.classList),
              });

              muteButton.style.display = "flex";
              muteButton.classList.add("talkweb-mute-show");

              console.log("✅ After showing - muteButton:", {
                newDisplay: muteButton.style.display,
                classList: Array.from(muteButton.classList),
              });
              console.log("✅ Mute button shown (voice active)");
            } else {
              console.error("❌ muteButton is null - cannot show!");
            }

            // Show minimized mute button if in minimized state
            if (widgetState === "minimized" && minimizedMuteButton) {
              minimizedMuteButton.style.display = "flex";
              console.log("✅ Minimized mute button shown");
            }

            // Forward to parent window for external listeners
            if (window.parent !== window) {
              window.parent.postMessage(
                {
                  type: "talkweb_voice_session_started",
                  assistantId: assistantId,
                  timestamp: Date.now(),
                },
                "*",
              );
            }
            break;

          case "request_mute_state":
            console.log("WIDGET: Iframe requested current mute state");
            markIframeReady("request_mute_state message");
            notifyIframeMuteState(voiceDisabled || !hasValidConsent() || isMuted, {
              fromMinimized: widgetState === "minimized",
            });
            break;

          case "voice_session_ended":
            console.log("WIDGET: Voice session ended - hiding mute button");

            // Hide mute button in expanded view
            if (muteButton) {
              muteButton.style.display = "none";
              muteButton.classList.remove("talkweb-mute-show", "talkweb-mute-active");
              console.log("✅ Mute button hidden");
            }

            // Hide minimized mute button
            if (minimizedMuteButton) {
              minimizedMuteButton.style.display = "none";
              minimizedMuteButton.classList.remove("talkweb-mute-active");
              console.log("✅ Minimized mute button hidden");
            }

            // Hide privacy badge
            if (privacyStatusBadge) {
              privacyStatusBadge.style.display = "none";
            }

            // Reset mute state
            isMuted = false;
            console.log("✅ Mute state reset");

            // Forward to parent window for external listeners
            if (window.parent !== window) {
              window.parent.postMessage(
                {
                  type: "talkweb_voice_session_ended",
                  assistantId: assistantId,
                  timestamp: Date.now(),
                },
                "*",
              );
            }
            break;

          case "VOICE_NAVIGATE":
            // STEP 2: Handle navigation with parent origin context
            if (event.data.url) {
              console.log("🌐 STEP 2: Navigation requested:", event.data.url);
              console.log("🌐 STEP 2: Current parent origin:", parentOrigin);
              console.log("🌐 STEP 2: Widget base URL:", baseUrl);
              console.log("🌐 STEP 2: Open in new tab:", event.data.openInNewTab);

              // DEBUG: Log to debug panel
              addNavigationLog("VOICE_NAVIGATE message received", event.data.url);

              // Check if URL is relative or absolute
              let targetUrl = event.data.url;

              // If it's a relative path, construct with parent origin
              if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
                // Ensure path starts with /
                if (!targetUrl.startsWith("/")) {
                  targetUrl = "/" + targetUrl;
                }
                targetUrl = parentOrigin + targetUrl;
                console.log("🌐 STEP 2: Constructed absolute URL from relative path:", targetUrl);
                addNavigationLog("Constructed absolute URL", targetUrl);
              } else {
                addNavigationLog("Using provided absolute URL", targetUrl);
              }

              // Open in new tab if requested, otherwise same tab
              if (event.data.openInNewTab) {
                addNavigationLog("Opening in new tab...", targetUrl);
                window.open(targetUrl, "_blank", "noopener,noreferrer");
                console.log("🌐 STEP 2: Opened in new tab:", targetUrl);
              } else {
                addNavigationLog("Navigating parent window...", targetUrl);
                window.location.href = targetUrl;
                console.log("🌐 STEP 2: Navigating parent window to:", targetUrl);
              }
            }
            break;

          case "VOICE_SCROLL":
            // Scroll to anchor on parent page
            if (event.data.anchor) {
              const element = document.querySelector(event.data.anchor);
              if (element) {
                element.scrollIntoView({ behavior: "smooth", block: "start" });
                console.log("WIDGET: Scrolled to anchor:", event.data.anchor);
              } else {
                console.warn("WIDGET: Anchor element not found:", event.data.anchor);
              }
            }
            break;

          case "conversation_limit_reached":
            // Handle 429 conversation limit exceeded
            console.log("🚫 WIDGET: Conversation limit reached");
            displayLimitReachedModal(event.data.fallbackContacts, event.data.message);
            break;

          default:
            console.debug("WIDGET: Unknown message type:", event.data.type);
        }
      }
    });

    console.log("Widget created successfully! Version:", WIDGET_VERSION);

    // Verify widget is in DOM
    setTimeout(() => {
      const check = document.querySelector("#talkweb-widget-container");
      if (check) {
        console.log("✅ Widget confirmed in DOM");
      } else {
        console.error("❌ Widget NOT found in DOM");
      }
    }, 100);
  }

  // Display conversation limit reached modal with fallback contacts
  function displayLimitReachedModal(fallbackContacts, message) {
    const modalId = "talkweb-limit-modal";

    // Remove existing modal if any
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = modalId;

    // Build contact options HTML
    let contactsHTML = "";
    if (fallbackContacts) {
      if (fallbackContacts.phone) {
        contactsHTML += `
          <a href="tel:${fallbackContacts.phone}" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(217, 91%, 55%));
            color: white;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 500;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
          " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(59, 130, 246, 0.4)';" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)';">
            <span style="font-size: 24px;">📞</span>
            <div>
              <div style="font-size: 14px; opacity: 0.9;">Call Us</div>
              <div style="font-size: 16px; font-weight: 600;">${fallbackContacts.phone}</div>
            </div>
          </a>
        `;
      }

      if (fallbackContacts.email) {
        contactsHTML += `
          <a href="mailto:${fallbackContacts.email}" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: white;
            color: #1f2937;
            border: 2px solid hsl(217, 91%, 60%);
            border-radius: 12px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s;
          " onmouseover="this.style.background='#f8fafc';" onmouseout="this.style.background='white';">
            <span style="font-size: 24px;">✉️</span>
            <div>
              <div style="font-size: 14px; color: #6b7280;">Email Us</div>
              <div style="font-size: 16px; font-weight: 600; color: hsl(217, 91%, 60%);">${fallbackContacts.email}</div>
            </div>
          </a>
        `;
      }

      if (fallbackContacts.website) {
        contactsHTML += `
          <a href="${fallbackContacts.website}" target="_blank" rel="noopener noreferrer" style="
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: white;
            color: #1f2937;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.2s;
          " onmouseover="this.style.borderColor='hsl(217, 91%, 60%)'; this.style.background='#f8fafc';" onmouseout="this.style.borderColor='#e5e7eb'; this.style.background='white';">
            <span style="font-size: 24px;">🌐</span>
            <div>
              <div style="font-size: 14px; color: #6b7280;">Visit Website</div>
              <div style="font-size: 16px; font-weight: 600; color: hsl(217, 91%, 60%);">Learn More</div>
            </div>
          </a>
        `;
      }
    }

    modal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.6);
        z-index: 10000001;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        padding: 20px;
        box-sizing: border-box;
      " class="talkweb-animate-fade-in">
        
        <div style="
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 500px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 70px -10px rgba(0, 0, 0, 0.4);
          position: relative;
        " class="talkweb-animate-scale-in">
          
          <!-- Header -->
          <div style="text-align: center; margin-bottom: 24px;">
            <div style="
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, #fef3c7, #fde68a);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 16px;
              font-size: 32px;
            ">⏸️</div>
            <h3 style="
              margin: 0 0 8px 0;
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
            ">Assistant Temporarily Unavailable</h3>
            <p style="
              margin: 0;
              color: #6b7280;
              font-size: 15px;
              line-height: 1.5;
            ">${message || "This assistant has reached its usage limit. Please contact us directly using the options below."}</p>
          </div>
          
          <!-- Fallback Contacts -->
          ${
            contactsHTML
              ? `
            <div style="margin-bottom: 24px;">
              <div style="
                font-size: 14px;
                font-weight: 600;
                color: #374151;
                margin-bottom: 12px;
                text-align: center;
              ">Contact Us Directly:</div>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                ${contactsHTML}
              </div>
            </div>
          `
              : ""
          }
          
          <!-- Info Box -->
          <div style="
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
          ">
            <div style="display: flex; align-items: flex-start; gap: 12px;">
              <span style="font-size: 20px;">ℹ️</span>
              <p style="
                margin: 0;
                font-size: 13px;
                color: #0c4a6e;
                line-height: 1.5;
              ">
                The AI assistant will be available again shortly. In the meantime, we're here to help through our direct contact options above.
              </p>
            </div>
          </div>
          
          <!-- Close Button -->
          <button id="talkweb-limit-close" style="
            width: 100%;
            padding: 14px;
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
            border-radius: 10px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
          " onmouseover="this.style.background='#e5e7eb';" onmouseout="this.style.background='#f3f4f6';">
            Close
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Close button handler
    document.getElementById("talkweb-limit-close").addEventListener("click", () => {
      modal.remove();
    });

    // Close on backdrop click
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Initialize when DOM is ready
  async function initializeWidget() {
    // Fetch assistant config first for dynamic theming
    await fetchAssistantConfig();
    // Then create the widget
    createWidget();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeWidget);
  } else {
    initializeWidget();
  }
})();
