import React from 'react';
import { Mic, MessageSquare, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant' | 'system';
  timestamp?: Date;
  source?: 'voice' | 'text' | 'separator';
  error?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  className?: string;
  userBubbleColor?: string | null;
  aiBubbleColor?: string | null;
  userTextColor?: string | null;
  aiTextColor?: string | null;
}

// Convert markdown to formatted HTML
const renderMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/#{1,3}\s(.*?)(\n|$)/g, '<strong class="text-base">$1</strong>$2')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, 
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>')
    .replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, 
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800">$1</a>');
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, className, userBubbleColor, aiBubbleColor, userTextColor, aiTextColor }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isVoice = message.source === 'voice';
  const isSeparator = message.source === 'separator';
  const isAssistantVoice = !isUser && isVoice;
  
  // PHASE 2 & 4: Enhanced conversation separator with better visual design
  if (isSeparator || isSystem) {
    const isMarker = message.text.includes('🟢') || message.text.includes('🔴');
    
    if (isMarker) {
      // PHASE 4: Session markers (start/end indicators)
      return (
        <div className={cn("flex justify-center my-6", className)}>
          <div className="flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-full border bg-card/50 backdrop-blur-sm">
            <span className={cn(
              "text-xs",
              message.text.includes('🟢') ? "text-green-600" : "text-red-500"
            )}>
              {message.text}
            </span>
            {/* Removed timestamp for natural feel */}
          </div>
        </div>
      );
    }
    
    // PHASE 4: Regular conversation turn separators
    return (
      <div className={cn("flex justify-center my-8", className)}>
        <div className="flex items-center gap-4 text-xs text-muted-foreground/60 font-medium tracking-wider max-w-md">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-border"></div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card/30 border border-border/50 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-bold tracking-widest">New Turn</span>
            <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
            {/* Removed timestamp for natural feel */}
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-border via-border to-transparent"></div>
        </div>
      </div>
    );
  }
  
  // Simplified state detection - only error or normal
  const messageState = message.error ? 'error' : 'normal';
  
  const customBubbleStyle: React.CSSProperties = {};
  if (isUser && userBubbleColor) customBubbleStyle.backgroundColor = userBubbleColor;
  if (isUser && userTextColor) customBubbleStyle.color = userTextColor;
  if (!isUser && aiBubbleColor) customBubbleStyle.backgroundColor = aiBubbleColor;
  if (!isUser && aiTextColor) customBubbleStyle.color = aiTextColor;

  return (
    <div className={cn(
      "flex animate-fade-in", 
      isUser ? "justify-end" : "justify-start", 
      className
    )}>
      <div
        style={customBubbleStyle}
        className={cn(
        "max-w-[85%] rounded-2xl text-sm relative overflow-hidden",
        "shadow-sm border transition-all duration-300",
        isUser 
          ? cn(
              !userBubbleColor && "bg-primary text-primary-foreground border-primary/20",
              isVoice && "shadow-lg shadow-primary/20"
            )
          : cn(
              !aiBubbleColor && "bg-white text-gray-900 border-gray-200",
              isVoice && "shadow-lg shadow-gray-400/30"
            ),
        messageState === 'error' && "border-red-300 shadow-red-100"
      )}>
        {/* Simplified source indicator */}
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs border-b backdrop-blur-sm",
          isUser 
            ? cn(
                "bg-white/10 text-white/80 border-white/15",
                isVoice && "bg-white/15"
              )
            : cn(
                "bg-gray-100 border-gray-200 text-gray-700",
                isVoice && "bg-gray-50"
              ),
          messageState === 'error' && "bg-red-50/50 text-red-700 border-red-200"
        )}>
          <div className="flex items-center gap-2">
            {isVoice ? (
              <div className="flex items-center gap-1.5">
                {isAssistantVoice ? <Volume2 size={12} /> : <Mic size={12} className={cn(
                  messageState === 'error' && "text-red-500"
                )} />}
                <span className="font-medium">
                  {messageState === 'error'
                    ? 'Failed'
                    : isAssistantVoice 
                      ? 'AI Voice' 
                      : 'Voice'
                  }
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <MessageSquare size={12} />
                <span className="font-medium">Text</span>
              </div>
            )}
          </div>
          
          {/* Removed timestamp display for natural conversation feel */}
          <div className="ml-auto opacity-60">
            {/* PHASE 4: Enhanced conversation turn indicator for AI responses */}
            {message.id.includes('ai-response-') && (
              <div className="flex items-center gap-1">
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 font-medium">
                  AI Turn
                </span>
                <span className="w-1 h-1 rounded-full bg-primary/60 animate-pulse"></span>
              </div>
            )}
          </div>
        </div>
        
        {/* Simplified message content - always shows complete text */}
        <div className={cn(
          "p-4 leading-relaxed",
          isVoice && "bg-gradient-to-br from-transparent to-black/5",
          messageState === 'error' && "bg-red-50/20",
          isUser && isVoice && "font-medium bg-white/5 border-l-2 border-white/20"
        )}>
          <div 
            className={cn(
              "transition-all duration-200 whitespace-pre-line",
              isVoice && "animate-slide-in-right",
              messageState === 'error' && "text-red-600 italic"
            )}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.text) }}
          />
        </div>
        
        {/* Simplified visual accent for voice messages */}
        {isVoice && (
          <>
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r",
              messageState === 'error' 
                ? "from-red-300/40 to-red-400/60"
                : isUser 
                  ? "from-white/20 to-white/40"
                  : "from-border/20 to-border/40"
            )} />
            
            <div className={cn(
              "absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full animate-pulse",
              isUser ? "bg-primary/60" : "bg-muted-foreground/60"
            )} />
          </>
        )}
        
        {/* PHASE 4: Text message indicator */}
        {!isVoice && message.source === 'text' && (
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
        )}
      </div>
    </div>
  );
};