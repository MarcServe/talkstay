import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Globe, Check } from 'lucide-react';
import { languageManager, SUPPORTED_LANGUAGES } from '@/utils/languageDetection';
import { translator, useTranslation } from '@/utils/translations';

interface LanguageSelectorProps {
  variant?: 'button' | 'compact' | 'full';
  showLabel?: boolean;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'button',
  showLabel = true,
  className = ''
}) => {
  const { t } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(languageManager.getCurrentLanguage());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = languageManager.onLanguageChange((language) => {
      setCurrentLanguage(language);
      translator.setLanguage(language);
    });

    return unsubscribe;
  }, []);

  const handleLanguageChange = (languageKey: string) => {
    languageManager.setLanguage(languageKey);
    setIsOpen(false);
    
    // Show success message
    const config = SUPPORTED_LANGUAGES[languageKey];
    if (config) {
      // Simple toast notification
      const toast = document.createElement('div');
      toast.textContent = `Language changed to ${config.nativeName}`;
      toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: hsl(var(--primary));
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      `;
      
      const style = document.createElement('style');
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(toast);
      
      setTimeout(() => {
        toast.remove();
        style.remove();
      }, 3000);
    }
  };

  const currentConfig = SUPPORTED_LANGUAGES[currentLanguage];
  const languages = languageManager.getAllLanguages();

  if (variant === 'compact') {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`flex items-center gap-2 ${className}`}
          >
            <span className="text-lg">{currentConfig.flag}</span>
            <span className="text-sm font-medium">{currentConfig.code.toUpperCase()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="end">
          <div className="space-y-1">
            {languages.map(({ key, config }) => (
              <Button
                key={key}
                variant={currentLanguage === key ? "secondary" : "ghost"}
                className="w-full justify-start text-left"
                onClick={() => handleLanguageChange(key)}
              >
                <span className="text-lg mr-3">{config.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{config.nativeName}</div>
                  <div className="text-xs text-muted-foreground">{config.name}</div>
                </div>
                {currentLanguage === key && (
                  <Check className="w-4 h-4 ml-2" />
                )}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === 'full') {
    return (
      <Card className={`bg-glass border-glass backdrop-blur-md ${className}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5" />
            <h3 className="font-semibold">{t('language.select')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {languages.map(({ key, config }) => (
              <Button
                key={key}
                variant={currentLanguage === key ? "default" : "outline"}
                className="justify-start text-left h-auto p-3"
                onClick={() => handleLanguageChange(key)}
              >
                <span className="text-xl mr-3">{config.flag}</span>
                <div>
                  <div className="font-medium text-sm">{config.nativeName}</div>
                  <div className="text-xs opacity-70">{config.name}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={`flex items-center gap-2 ${className}`}
        >
          <Globe className="w-4 h-4" />
          {showLabel && (
            <>
              <span className="text-lg">{currentConfig.flag}</span>
              <span className="hidden sm:inline">{currentConfig.nativeName}</span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <div className="space-y-1">
          <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
            {t('language.select')}
          </div>
          {languages.map(({ key, config }) => (
            <Button
              key={key}
              variant={currentLanguage === key ? "secondary" : "ghost"}
              className="w-full justify-start text-left h-auto p-3"
              onClick={() => handleLanguageChange(key)}
            >
              <span className="text-lg mr-3">{config.flag}</span>
              <div className="flex-1">
                <div className="font-medium">{config.nativeName}</div>
                <div className="text-xs text-muted-foreground">{config.name}</div>
              </div>
              {currentLanguage === key && (
                <Check className="w-4 h-4 ml-2 text-primary" />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};