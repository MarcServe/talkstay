# Voice Form Chat Integration

This guide explains how to integrate voice forms into your chat interface.

## Overview

The voice form chat integration allows users to fill out forms during chat conversations. Forms can be triggered manually by the user or automatically based on conversation context.

## Components

### 1. `VoiceFormChatIntegration`
Main integration component that manages form state and displays available forms.

### 2. `VoiceFormChatTrigger`
Displays available forms as clickable cards in the chat interface.

### 3. `VoiceFormChatModal`
Modal dialog that contains the form filling experience.

### 4. `VoiceFormFillerModal`
The actual form interface with field-by-field progression and voice input support.

## Quick Setup

### Basic Integration

```tsx
import { VoiceFormChatIntegration } from '@/components/VoiceFormChatIntegration';

const ChatInterface = () => {
  const assistantId = "your-assistant-id";
  const sessionId = useSessionId(); // Your session management

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map(msg => <Message key={msg.id} {...msg} />)}
      </div>
      
      {/* Add the integration component */}
      <VoiceFormChatIntegration 
        assistantId={assistantId} 
        sessionId={sessionId} 
      />
      
      <div className="input-area">
        <MessageInput />
      </div>
    </div>
  );
};
```

### Custom Hook Usage

If you need more control, use the `useVoiceFormChat` hook directly:

```tsx
import { useVoiceFormChat } from '@/hooks/useVoiceFormChat';

const CustomChatComponent = () => {
  const {
    availableForms,
    activeForm,
    loadAvailableForms,
    triggerForm,
    closeForm,
    submitForm,
  } = useVoiceFormChat({ assistantId, sessionId });

  // Load forms on mount
  useEffect(() => {
    loadAvailableForms();
  }, []);

  // Trigger a specific form programmatically
  const handleTriggerContactForm = () => {
    const contactForm = availableForms.find(f => f.name === "Contact Form");
    if (contactForm) {
      triggerForm(contactForm.id);
    }
  };

  return (
    // Your custom implementation
  );
};
```

## Features

### Automatic Form Discovery
- Forms are automatically loaded for the assistant
- Only active forms are shown to users
- Forms are displayed as cards with descriptions

### Voice & Text Input
- Support for both voice and text input
- Field-by-field progression
- Visual progress indicator
- Validation and error handling

### Session Linking
- Form submissions are linked to chat sessions
- Enables conversation context in form data
- Allows follow-up questions based on form responses

## Styling

The components use your existing design system tokens:
- `bg-muted` for subtle backgrounds
- `border-primary` for form highlights
- `text-muted-foreground` for secondary text
- Responsive cards with hover effects

## Database Setup

Ensure your `voice_forms` table includes:
```sql
CREATE TABLE voice_forms (
  id UUID PRIMARY KEY,
  assistant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  fields JSONB NOT NULL,
  settings JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Best Practices

1. **Session Management**: Always pass a valid session ID to link submissions
2. **Form Naming**: Use clear, descriptive names for forms
3. **Field Prompts**: Write natural, conversational voice prompts
4. **Error Handling**: The components handle errors gracefully with toast notifications
5. **Loading States**: Forms load asynchronously - ensure proper loading UX

## Next Steps

- Add automatic form triggering based on AI conversation analysis
- Implement form analytics tracking
- Create custom form templates
- Add multi-step form support
