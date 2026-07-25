import React, { useState, useEffect } from 'react';
import { Lightbulb, X, Mic, Edit3, Shield, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { voiceTransitions } from '@/utils/voiceTransitions';
import { conversationMemory } from '@/utils/ConversationMemory';
import { cn } from '@/lib/utils';

interface SmartInputSuggestionsProps {
  fieldType: string;
  currentMethod: 'voice' | 'text' | 'secure';
  onMethodChange: (method: 'voice' | 'text' | 'secure') => void;
  className?: string;
}

export const SmartInputSuggestions: React.FC<SmartInputSuggestionsProps> = ({
  fieldType,
  currentMethod,
  onMethodChange,
  className
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [uxSuggestion, setUxSuggestion] = useState<any>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Check for UX suggestions in conversation memory
  useEffect(() => {
    // Get smart suggestions from voice transitions
    const smartSuggestions = voiceTransitions.getSuggestions();
    setSuggestions(smartSuggestions);

    // Note: UX suggestions would be implemented when ConversationMemory supports them
  }, [currentMethod, fieldType]);

  const getMethodIcon = (method: 'voice' | 'text' | 'secure') => {
    switch (method) {
      case 'voice':
        return <Mic className="h-3 w-3" />;
      case 'text':
        return <Edit3 className="h-3 w-3" />;
      case 'secure':
        return <Shield className="h-3 w-3" />;
    }
  };

  const handleSuggestionDismiss = (type: string) => {
    setDismissed(prev => new Set([...prev, type]));
    if (uxSuggestion?.type === type) {
      setUxSuggestion(null);
    }
  };

  const handleMethodSuggestion = (method: 'voice' | 'text' | 'secure') => {
    onMethodChange(method);
    setUxSuggestion(null);
  };

  const getPreferredMethod = () => {
    return voiceTransitions.getPreferredMethod(fieldType);
  };

  const getFieldStats = () => {
    return voiceTransitions.getFieldStatistics(fieldType);
  };

  if (suggestions.length === 0 && !uxSuggestion) return null;

  return (
    <div className={cn("space-y-2", className)}>
      {/* UX Suggestion Card */}
      {uxSuggestion && !dismissed.has(uxSuggestion.type) && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-blue-900">{uxSuggestion.message}</p>
                  {uxSuggestion.suggestedMethod && uxSuggestion.suggestedMethod !== currentMethod && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleMethodSuggestion(uxSuggestion.suggestedMethod)}
                      className="mt-2 h-6 text-xs border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      {getMethodIcon(uxSuggestion.suggestedMethod)}
                      <span className="ml-1">
                        Try {uxSuggestion.suggestedMethod === 'voice' ? 'Voice' : 
                             uxSuggestion.suggestedMethod === 'secure' ? 'Secure' : 'Typing'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSuggestionDismiss(uxSuggestion.type)}
                className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Insights */}
      {(() => {
        const stats = getFieldStats();
        const preferredMethod = getPreferredMethod();
        
        if (stats.totalTransitions > 3 && preferredMethod !== currentMethod && !dismissed.has('performance_insight')) {
          return (
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-amber-900">
                        You tend to prefer {preferredMethod === 'voice' ? 'voice input' : preferredMethod === 'secure' ? 'secure input' : 'typing'} for this field
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                          {Math.round(stats.successRate * 100)}% success rate
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMethodSuggestion(preferredMethod)}
                          className="h-6 text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
                        >
                          {getMethodIcon(preferredMethod)}
                          <span className="ml-1">Switch to {preferredMethod}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSuggestionDismiss('performance_insight')}
                    className="h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        }
        return null;
      })()}

      {/* General Suggestions */}
      {suggestions.map((suggestion, index) => (
        <Card key={index} className="border-green-200 bg-green-50">
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-green-600 mt-0.5" />
                <p className="text-sm text-green-900">{suggestion}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSuggestionDismiss(`general_${index}`)}
                className="h-6 w-6 p-0 text-green-600 hover:bg-green-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};