(function() {
  // STAGING WIDGET - Safe for development testing
  console.log('TalkWeb Staging Widget Loading...');
  
  // TARGETED DISABLE: Only disable on TalkWeb's main site, allow on external sites
  const currentDomain = window.location.hostname;
  const currentPath = window.location.pathname;
  
  // Only disable if this is the main TalkWeb site (not external sites like gbproute.com)
  if (currentDomain.includes('talkweb.io') || currentDomain.includes('lovableproject.com')) {
    // On TalkWeb domains, only allow on preview pages or staging
    if (!currentPath.includes('/preview') && !currentDomain.includes('staging.')) {
      console.log('TalkWeb Staging Widget: Disabled on main TalkWeb site routes');
      return;
    }
  }

  // LEGACY WIDGET CLEANUP - Remove any old TalkWeb widgets first
  function cleanupLegacyWidgets() {
    const legacySelectors = [
      '#talkweb-teaser', '.tw-inline-bubble', '.tw-teaser',
      '[data-tw=\\\"teaser\\\"]', '[data-tw-position=\\\"bottom-left\\\"]',
      'iframe[src*=\\\"talkweb.io\\\"][data-tw=\\\"teaser\\\"]',
      '.talkweb-legacy', '[data-talkweb-legacy]'
    ];
    
    legacySelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        console.log('🧹 Staging: Removing legacy TalkWeb element:', selector);
        element.remove();
      });
    });
  }

  // Add defensive CSS to hide legacy widgets
  function addLegacyBlockerCSS() {
    if (document.getElementById('talkweb-staging-legacy-blocker')) return;
    
    const style = document.createElement('style');
    style.id = 'talkweb-staging-legacy-blocker';
    style.textContent = `
      /* Hide any legacy TalkWeb teaser/mini launcher */
      #talkweb-teaser,
      .tw-inline-bubble,
      .tw-teaser,
      [data-tw=\\\"teaser\\\"],
      [data-tw-position=\\\"bottom-left\\\"],
      iframe[src*=\\\"talkweb.io\\\"][data-tw=\\\"teaser\\\"],
      .talkweb-legacy,
      [data-talkweb-legacy] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Run cleanup immediately and periodically
  cleanupLegacyWidgets();
  addLegacyBlockerCSS();
  setInterval(cleanupLegacyWidgets, 2000);

  // Get assistant ID and base URL from script tag
  const currentScript = document.currentScript || document.querySelector('script[data-assistant]');
  const assistantId = currentScript?.getAttribute('data-assistant') || 'e7fa0f16-ba8e-4277-bd80-70f0aa25cbad';
  let baseUrl = currentScript?.getAttribute('data-base-url');
  
  // Environment-aware URL detection for staging with better external site support
  if (!baseUrl) {
    const hostname = window.location.hostname;
    console.log('🔍 Widget: Detecting environment for hostname:', hostname);
    
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      baseUrl = 'http://localhost:8080';
      console.log('📍 Widget: Using localhost environment');
    } else if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) {
      // Use the current Lovable environment
      baseUrl = `${window.location.protocol}//${window.location.host}`;
      console.log('📍 Widget: Using Lovable sandbox environment:', baseUrl);
    } else {
      // For external websites, use the staging server
      baseUrl = 'https://staging.talkweb.io';
      console.log('📍 Widget: External site detected, using staging environment');
    }
  } else {
    console.log('📍 Widget: Using provided base URL:', baseUrl);
  }
  
  const hideTeaser = currentScript?.getAttribute('data-hide-teaser') === 'true';
  const position = currentScript?.getAttribute('data-position') || 'bottom-right';
  
  if (!assistantId) {
    console.error('🚨 TalkWeb Staging Widget: No assistant ID found. Please add data-assistant attribute to the script tag.');
    console.error('🔧 Example: <script data-assistant="your-id" src="widget-staging.js"></script>');
    return;
  }

  console.log('✅ TalkWeb Staging Widget initialized:', { 
    assistantId, 
    baseUrl, 
    hideTeaser, 
    position,
    currentDomain: window.location.hostname,
    scriptSrc: currentScript?.src || 'unknown'
  });
  
  // Enhanced protection against duplicate loading
  if (window.talkWebStagingWidgetLoaded) {
    console.warn('TalkWeb Staging Widget already loaded, preventing duplicate');
    return;
  }
  window.talkWebStagingWidgetLoaded = true;

  // State management for voice session protection
  let chatOpen = false;
  let chatIframe = null;
  let voiceSessionActive = false;
  let activeVoiceIframes = new Set();
  let currentVoiceIframe = null;
  let chatMinimized = false;
  
  // Create completely isolated widget root container
  const widgetRoot = document.createElement('div');
  widgetRoot.id = 'talkweb-staging-root';
  widgetRoot.style.cssText = `
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    pointer-events: none !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
  `;
  document.body.appendChild(widgetRoot);

  // Add staging indicator
  const stagingIndicator = document.createElement('div');
  stagingIndicator.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    right: 10px !important;
    background: #ff6b35 !important;
    color: white !important;
    padding: 4px 8px !important;
    border-radius: 4px !important;
    font-size: 12px !important;
    font-weight: bold !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    opacity: 0.8 !important;
  `;
  stagingIndicator.textContent = 'STAGING';
  widgetRoot.appendChild(stagingIndicator);

  // Rest of widget functionality (same as production but with staging URLs)
  

  // Create the widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.style.cssText = `
    position: fixed !important;
    ${position.includes('right') ? 'right: 20px !important;' : 'left: 20px !important;' }
    ${position.includes('top') ? 'top: 20px !important;' : 'bottom: 20px !important;' }
    display: flex !important;
    flex-direction: column !important;
    align-items: ${position.includes('right') ? 'flex-end' : 'flex-start'} !important;
    gap: 12px !important;
    z-index: 2147483646 !important;
    pointer-events: auto !important;
  `;

  // Add staging banner to promotional text
  const promoText = document.createElement('div');
  promoText.style.cssText = `
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    color: white !important;
    padding: 8px 16px !important;
    border-radius: 20px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    white-space: nowrap !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    border: 2px solid #ff6b35 !important;
  `;
  promoText.textContent = "STAGING - TALK to me 🎙️";
  promoText.addEventListener('click', openChat);

  // Voice and chat buttons with staging styling
  const voiceButton = document.createElement('button');
  voiceButton.style.cssText = `
    width: 56px !important;
    height: 56px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border: 3px solid #ff6b35 !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4) !important;
    transition: all 0.3s ease !important;
    outline: none !important;
  `;

  // Add microphone SVG
  voiceButton.innerHTML = `
    <svg width=\\\"24\\\" height=\\\"24\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\">
      <path d=\\\"M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z\\\" fill=\\\"white\\\"/>
      <path d=\\\"M19 10V12C19 16.97 15.39 21 10.5 21.5V19.5C14.28 19.02 17 15.77 17 12V10H19ZM7 10V12C7 15.77 9.72 19.02 13.5 19.5V21.5C8.61 21 5 16.97 5 12V10H7Z\\\" fill=\\\"white\\\"/>
    </svg>
  `;

  const chatButton = document.createElement('button');
  chatButton.style.cssText = `
    width: 56px !important;
    height: 56px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
    border: 3px solid #ff6b35 !important;
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4) !important;
    transition: all 0.3s ease !important;
    outline: none !important;
  `;

  // Add chat SVG
  chatButton.innerHTML = `
    <svg width=\\\"24\\\" height=\\\"24\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\">
      <path d=\\\"M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z\\\" fill=\\\"white\\\"/>
      <path d=\\\"M7 9H17V11H7V9ZM7 12H15V14H7V12Z\\\" fill=\\\"white\\\"/>
    </svg>
  `;

  // Add elements to container
  if (!hideTeaser) {
    widgetContainer.appendChild(promoText);
  }
  widgetContainer.appendChild(voiceButton);
  widgetContainer.appendChild(chatButton);
  widgetRoot.appendChild(widgetContainer);

  // Open chat function with staging URL
  function openChat() {
    if (chatOpen) return;
    
    chatOpen = true;
    chatMinimized = false;
    
    console.log('Opening staging chat interface');

    // Create floating chat panel
    const chatPanel = document.createElement('div');
    chatPanel.id = 'talkweb-staging-chat';
    
    // Detect mobile and set appropriate width
    const isMobile = window.innerWidth <= 640;
    const panelWidth = isMobile ? '95vw' : '400px';
    
    chatPanel.style.cssText = `
      position: fixed !important;
      ${position.includes('right') ? 'right: 20px !important;' : 'left: 20px !important;' }
      ${position.includes('top') ? 'top: 20px !important;' : 'bottom: 90px !important;' }
      width: ${panelWidth} !important;
      max-width: 95vw !important;
      height: 600px !important;
      background: white !important;
      border-radius: 12px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3) !important;
      z-index: 2147483645 !important;
      pointer-events: auto !important;
      overflow: hidden !important;
      border: 3px solid #ff6b35 !important;
    `;

    // Create chat header with staging indicator
    const chatHeader = document.createElement('div');
    chatHeader.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      padding: 12px 16px !important;
      font-weight: 600 !important;
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      border-bottom: 2px solid #ff6b35 !important;
    `;
    chatHeader.innerHTML = `
      <span>STAGING Chat Assistant</span>
      <button id=\\\"staging-close-chat\\\" style=\\\"background: none; border: none; color: white; font-size: 20px; cursor: pointer; min-width: 36px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; padding-right: 4px;\\\">×</button>
    `;

    // Create iframe with staging URL
    chatIframe = document.createElement('iframe');
    chatIframe.style.cssText = `
      width: 100% !important;
      height: calc(100% - 60px) !important;
      border: none !important;
      background: white !important;
    `;
    const chatUrl = `${baseUrl}/preview?assistant=${assistantId}&embedded=true&staging=true`;
    console.log('🚀 Widget: Loading chat interface:', chatUrl);
    chatIframe.src = chatUrl;
    
    // Add error handling for iframe loading
    chatIframe.onerror = function() {
      console.error('❌ Widget: Failed to load chat interface from:', chatUrl);
    };
    
    chatIframe.onload = function() {
      console.log('✅ Widget: Chat interface loaded successfully');
    };

    chatPanel.appendChild(chatHeader);
    chatPanel.appendChild(chatIframe);
    widgetRoot.appendChild(chatPanel);

    // Update chat button
    updateChatButton();

    // Add close functionality
    document.getElementById('staging-close-chat').addEventListener('click', closeChat);
  }

  // Close chat function
  function closeChat() {
    console.log('Closing TalkWeb staging chat widget');
    
    const chatPanel = document.getElementById('talkweb-staging-chat');
    if (chatPanel && chatIframe && chatIframe.contentWindow) {
      console.log('Sending close_widget message to staging iframe');
      chatIframe.contentWindow.postMessage({ type: 'close_widget' }, '*');
    }
    
    // Close immediately - no delay for better privacy  
    if (chatPanel) {
      chatPanel.remove();
    }
    chatOpen = false;
    chatIframe = null;
    updateChatButton();
  }

  // Update chat button appearance
  function updateChatButton() {
    if (chatOpen) {
      chatButton.innerHTML = `
        <svg width=\\\"24\\\" height=\\\"24\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\">
          <path d=\\\"M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z\\\" fill=\\\"white\\\"/>
        </svg>
      `;
    } else {
      chatButton.innerHTML = `
        <svg width=\\\"24\\\" height=\\\"24\\\" viewBox=\\\"0 0 24 24\\\" fill=\\\"none\\\" xmlns=\\\"http://www.w3.org/2000/svg\\\">
          <path d=\\\"M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM20 16H5.17L4 17.17V4H20V16Z\\\" fill=\\\"white\\\"/>
          <path d=\\\"M7 9H17V11H7V9ZM7 12H15V14H7V12Z\\\" fill=\\\"white\\\"/>
        </svg>
      `;
    }
  }

  // Event listeners
  voiceButton.addEventListener('click', openChat);
  chatButton.addEventListener('click', () => {
    if (chatOpen) {
      closeChat();
    } else {
      openChat();
    }
  });

  console.log('TalkWeb Staging Widget fully loaded');
})();
