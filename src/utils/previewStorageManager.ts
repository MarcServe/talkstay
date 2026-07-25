import { conversationMemory } from './ConversationMemory';

/**
 * Clears all preview-related storage and session data
 */
export const clearPreviewStorage = () => {
  console.log('🧹 Clearing preview storage...');
  
  // Clear conversation memory
  conversationMemory.clear();
  
  // Clear local storage items
  localStorage.removeItem('talkweb-language');
  
  // Clear session storage
  sessionStorage.removeItem('currentAssistantId');
  
  console.log('✅ Preview storage cleared');
};
