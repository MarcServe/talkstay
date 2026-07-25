import { supabase } from "@/integrations/supabase/client";

export type ReviewOrigin = 'booking' | 'whatsapp' | string;
export type ReviewChannel = 'voice' | 'chat' | string;

interface OpenReviewOptions {
  assistantId: string;
  origin: ReviewOrigin;
  channel: ReviewChannel;
  logoUrl?: string | null;
}

// Lightweight DOM-based review prompt so it works inside iframes and widget contexts
export async function openReviewPrompt(opts: OpenReviewOptions) {
  const { assistantId, origin, channel, logoUrl } = opts;

  // Avoid multiple prompts and only show at end of meaningful sessions
  if (document.getElementById('tw-review-backdrop')) return;
  
  // Don't show immediately - defer to natural conversation end
  if (origin === 'preview' && channel === 'voice') {
    // For voice, only show after explicit session end, not during conversation
    return;
  }

  const backdrop = document.createElement('div');
  backdrop.id = 'tw-review-backdrop';
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.6);
    z-index: 2147483000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    backdrop-filter: blur(2px);
  `;

  const panel = document.createElement('div');
  panel.id = 'tw-review-panel';
  panel.style.cssText = `
    width: 100%;
    max-width: 380px;
    max-height: 80vh;
    background: white;
    border-radius: 16px;
    overflow-y: auto;
    box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    border: 1px solid #e5e7eb;
    transform: scale(1);
    animation: slideInScale 0.3s ease-out;
  `;
  
  // Add animation keyframes
  if (!document.getElementById('tw-review-animations')) {
    const style = document.createElement('style');
    style.id = 'tw-review-animations';
    style.textContent = `
      @keyframes slideInScale {
        from {
          opacity: 0;
          transform: scale(0.9) translateY(20px);
        }
        to {
          opacity: 1;
          transform: scale(1) translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  const headerBg = logoUrl
    ? `background: linear-gradient( to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.55) ), url(${logoUrl}); background-size: cover; background-position: center;`
    : `background: linear-gradient(135deg, #6366f1, #3b82f6);`;

  panel.innerHTML = `
    <style>
      #tw-review-panel input[type="email"]{color:#000;caret-color:#000;-webkit-text-fill-color:#000;background:#fff;}
      #tw-review-comment {
        background: white !important;
        color: #1f2937 !important;
        border: 1px solid #d1d5db !important;
        outline: none !important;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif !important;
        pointer-events: auto !important;
        user-select: text !important;
        -webkit-user-select: text !important;
        cursor: text !important;
      }
      #tw-review-comment:focus {
        border-color: #6366f1 !important;
        box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1) !important;
      }
      #tw-review-comment::placeholder {
        color: #9ca3af !important;
        opacity: 1 !important;
      }
    </style>
    <div style="${headerBg}; color: white; padding: 16px;">
      <div style="font-size: 18px; font-weight: 700;">Share your experience</div>
      <div style="opacity: 0.9; font-size: 13px;">Your feedback helps us improve</div>
    </div>
    <div style="padding: 16px;">
      <div style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 500;">How was your experience?</div>
      <div id="tw-stars" style="display:flex; gap:10px; margin-bottom: 12px; justify-content: center;"></div>
       <div style="margin-bottom: 12px;">
        <textarea 
          id="tw-review-comment" 
          placeholder="Add a comment (optional)..." 
          rows="3" 
          style="width:100%; padding:10px; border:1px solid #d1d5db; border-radius: 6px; outline:none; resize: vertical; font-size: 13px; font-family: system-ui, -apple-system, sans-serif; box-sizing: border-box; background: white; color: #1f2937; pointer-events: auto; user-select: text; cursor: text;"
          autocomplete="off"
          spellcheck="true"
        ></textarea>
        <div style="display: flex; gap: 6px; margin-top: 6px;">
          <button id="tw-voice-record" style="padding: 6px 10px; background:#6366f1; color:white; border:none; border-radius:4px; cursor:pointer; font-size: 11px; display: flex; align-items: center; gap: 3px;">🎤 Voice</button>
          <span style="font-size: 11px; color: #9ca3af; align-self: center;">or type your comment</span>
        </div>
      </div>
      <div style="display:flex; flex-direction: column; gap:6px;">
        <button id="tw-review-submit" style="width: 100%; padding: 10px 14px; background:#10b981; color:white; border:none; border-radius:6px; cursor:pointer; font-weight: 500; font-size: 13px;">Submit Review</button>
        <button id="tw-review-cancel" style="width: 100%; padding: 8px 14px; border:1px solid #e5e7eb; background:white; border-radius:6px; cursor:pointer; color: #6b7280; font-size: 12px;">Skip</button>
      </div>
    </div>
  `;

  // Stars
  const starsWrap = panel.querySelector('#tw-stars') as HTMLDivElement;
  let current = 5;
  for (let i = 1; i <= 5; i++) {
    const s = document.createElement('span');
    s.textContent = '★';
    s.style.cssText = `font-size: 28px; cursor: pointer; color: ${i <= current ? '#f59e0b' : '#d1d5db'};`;
    s.addEventListener('mouseenter', () => {
      Array.from(starsWrap.children).forEach((c, idx) => {
        (c as HTMLElement).style.color = idx < i ? '#f59e0b' : '#d1d5db';
      });
    });
    s.addEventListener('mouseleave', () => {
      Array.from(starsWrap.children).forEach((c, idx) => {
        (c as HTMLElement).style.color = idx < current ? '#f59e0b' : '#d1d5db';
      });
    });
    s.addEventListener('click', () => { current = i; });
    starsWrap.appendChild(s);
  }

  // Voice recording functionality
  let isRecording = false;
  let mediaRecorder: MediaRecorder | null = null;
  
  const voiceButton = panel.querySelector('#tw-voice-record') as HTMLButtonElement;
  const commentTextarea = panel.querySelector('#tw-review-comment') as HTMLTextAreaElement;
  
  // Ensure textarea is properly activated
  commentTextarea?.addEventListener('focus', () => {
    commentTextarea.style.pointerEvents = 'auto';
    commentTextarea.style.userSelect = 'text';
    commentTextarea.style.cursor = 'text';
  });

  // Force focus and selection capabilities
  setTimeout(() => {
    if (commentTextarea) {
      commentTextarea.removeAttribute('readonly');
      commentTextarea.removeAttribute('disabled');
      commentTextarea.style.pointerEvents = 'auto';
      commentTextarea.style.userSelect = 'text';
      commentTextarea.tabIndex = 0;
    }
  }, 100);
  
  voiceButton?.addEventListener('click', async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];
        
        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };
        
        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
              // Call voice-to-text function
              const { data, error } = await supabase.functions.invoke('voice-to-text', {
                body: { audio: base64Audio }
              });
              
              if (!error && data?.text) {
                commentTextarea.value = (commentTextarea.value + ' ' + data.text).trim();
              }
            } catch (e) {
              console.error('Voice transcription error:', e);
            }
          };
          reader.readAsDataURL(audioBlob);
          
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
        };
        
        mediaRecorder.start();
        isRecording = true;
        voiceButton.textContent = '⏹️ Stop';
        voiceButton.style.background = '#ef4444';
      } catch (error) {
        console.error('Voice recording error:', error);
      }
    } else {
      mediaRecorder?.stop();
      isRecording = false;
      voiceButton.textContent = '🎤 Voice';
      voiceButton.style.background = '#6366f1';
    }
  });

  // Handlers
  const submit = async () => {
    const comment = commentTextarea?.value?.trim();
    try {
      // Always send to support@talkweb.io in preview mode
      const { error } = await supabase.functions.invoke('submit-review', {
        body: {
          assistantId,
          rating: current,
          comment: comment || 'No comment provided',
          origin,
          channel,
          userEmail: 'support@talkweb.io',
          sessionId: `preview-${Date.now()}`,
          metadata: { 
            preview_mode: true,
            timestamp: new Date().toISOString(),
            supportEmail: 'support@talkweb.io'
          }
        },
      });
      if (error) console.error('Review submit error:', error);
    } catch (e) {
      console.error('Review submit failed:', e);
    } finally {
      backdrop.remove();
      // Notify parent widget (if present) we can safely close chat
      window.parent?.postMessage({ type: 'close-chat' }, '*');
    }
  };

  panel.querySelector('#tw-review-cancel')?.addEventListener('click', () => backdrop.remove());
  panel.querySelector('#tw-review-submit')?.addEventListener('click', submit);

  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
}
