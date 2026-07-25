import React, { useEffect } from 'react';
import { useVoiceFormChat } from '@/hooks/useVoiceFormChat';
import { VoiceFormChatTrigger } from './VoiceFormChatTrigger';
import { VoiceFormChatModal } from './VoiceFormChatModal';

interface VoiceFormChatIntegrationProps {
  assistantId: string;
  sessionId: string;
}

/**
 * Integration component for voice forms in chat interfaces.
 * 
 * Usage:
 * 
 * ```tsx
 * // In your chat component:
 * import { VoiceFormChatIntegration } from '@/components/VoiceFormChatIntegration';
 * 
 * const ChatInterface = () => {
 *   const assistantId = "your-assistant-id";
 *   const sessionId = "current-session-id";
 * 
 *   return (
 *     <div className="chat-container">
 *       <div className="messages">
 *         {messages.map(msg => <Message key={msg.id} {...msg} />)}
 *       </div>
 *       
 *       <VoiceFormChatIntegration 
 *         assistantId={assistantId} 
 *         sessionId={sessionId} 
 *       />
 *       
 *       <div className="input-area">
 *         <MessageInput />
 *       </div>
 *     </div>
 *   );
 * };
 * ```
 */
export const VoiceFormChatIntegration: React.FC<VoiceFormChatIntegrationProps> = ({
  assistantId,
  sessionId,
}) => {
  const {
    availableForms,
    activeForm,
    isLoading,
    loadAvailableForms,
    triggerForm,
    closeForm,
    submitForm,
  } = useVoiceFormChat({ assistantId, sessionId });

  useEffect(() => {
    loadAvailableForms();
  }, [loadAvailableForms]);

  if (isLoading) return null;

  return (
    <>
      <VoiceFormChatTrigger
        forms={availableForms}
        onSelectForm={triggerForm}
      />

      <VoiceFormChatModal
        form={activeForm}
        open={!!activeForm}
        onClose={closeForm}
        onSubmit={submitForm}
      />
    </>
  );
};
