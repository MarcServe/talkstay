import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BrandedMicIcon } from '@/components/ui/branded-mic-icon';
import { Globe, Volume2, Mic } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/utils/languageDetection';
import { cn } from '@/lib/utils';
const bgMultilang = "/images/bg-multilang.webp";

const sampleTranslations = {
  'english': 'Hello! How can I help you today?',
  'spanish': '¡Hola! ¿Cómo puedo ayudarte hoy?',
  'french': 'Bonjour ! Comment puis-je vous aider aujourd\'hui ?',
  'german': 'Hallo! Wie kann ich Ihnen heute helfen?',
  'chinese': '您好！今天我可以为您提供什么帮助？',
  'japanese': 'こんにちは！今日はどのようにお手伝いできますか？',
  'arabic': 'مرحبا! كيف يمكنني مساعدتك اليوم؟',
  'hindi': 'नमस्ते! आज मैं आपकी कैसे मदद कर सकता हूं?',
  'portuguese': 'Olá! Como posso ajudá-lo hoje?',
  'russian': 'Привет! Как я могу помочь вам сегодня?',
  'italian': 'Ciao! Come posso aiutarti oggi?',
  'korean': '안녕하세요! 오늘 어떻게 도와드릴까요?'
};

export const MultiLanguageShowcase: React.FC = () => {
  const [activeLanguage, setActiveLanguage] = useState('english');
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLanguageClick = (langKey: string) => {
    if (langKey === activeLanguage) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setActiveLanguage(langKey);
      setIsAnimating(false);
    }, 150);
  };

  const languages = Object.entries(SUPPORTED_LANGUAGES);
  
  return (
    <section className="relative py-20 overflow-hidden" aria-label="Multi-language support">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-60"
        aria-hidden="true"
        style={{
          backgroundImage: `url(${bgMultilang})`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/70" />
      </div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Globe className="w-8 h-8 text-primary" />
            <h2 className="text-4xl font-bold">
              Speak{" "}
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Any Language
              </span>
            </h2>
          </div>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your voice assistant understands and responds in 57+ languages. 
            Real conversations, natural speech, global reach.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Interactive Language Demo */}
          <Card className="relative overflow-hidden">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <BrandedMicIcon size={24} showText={false} />
                Voice Demo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sample Translation Display */}
              <div className="min-h-[120px] flex items-center justify-center p-6 bg-muted/50 rounded-lg border-2 border-dashed border-primary/20">
                <div className={cn(
                  "text-center transition-all duration-300",
                  isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
                )}>
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <span className="text-2xl">
                      {SUPPORTED_LANGUAGES[activeLanguage].flag}
                    </span>
                    <Badge variant="secondary" className="text-sm">
                      {SUPPORTED_LANGUAGES[activeLanguage].nativeName}
                    </Badge>
                  </div>
                  <p className={cn(
                    "text-lg font-medium leading-relaxed",
                    SUPPORTED_LANGUAGES[activeLanguage].rtl ? "text-right" : "text-left"
                  )}>
                    "{sampleTranslations[activeLanguage as keyof typeof sampleTranslations]}"
                  </p>
                </div>
              </div>

              {/* Language Grid */}
              <div className="grid grid-cols-3 gap-2">
                {languages.map(([key, config]) => (
                  <Button
                    key={key}
                    variant={key === activeLanguage ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleLanguageClick(key)}
                    className={cn(
                      "h-auto p-3 flex flex-col gap-1 transition-all duration-200",
                      key === activeLanguage 
                        ? "bg-primary text-primary-foreground shadow-lg scale-105" 
                        : "hover:scale-102"
                    )}
                  >
                    <span className="text-lg" aria-label={config.name}>{config.flag}</span>
                    <span className="text-xs font-medium leading-tight">
                      {config.name}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features List */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Natural Speech Recognition</h3>
                <p className="text-muted-foreground">
                  Advanced AI understands accents, dialects, and natural speech patterns 
                  in every supported language.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Volume2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Native Voice Output</h3>
                <p className="text-muted-foreground">
                  Responds with authentic pronunciation and natural intonation 
                  that sounds like a native speaker.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Globe className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Cultural Context</h3>
                <p className="text-muted-foreground">
                  Understands cultural nuances, local expressions, and 
                  context-appropriate responses for each region.
                </p>
              </div>
            </div>

            {/* Language Count Badge */}
            <div className="pt-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Globe className="w-4 h-4 mr-2" />
                57+ Languages Supported
              </Badge>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Ready to reach a global audience?
          </p>
          <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-white">
            Try Multi-Language Demo
          </Button>
        </div>
      </div>
    </section>
  );
};