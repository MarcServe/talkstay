// Language Detection and Management Utility
interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  speechCode: string;
  flag: string;
  rtl?: boolean;
}

export const SUPPORTED_LANGUAGES: Record<string, LanguageConfig> = {
  'english': {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    speechCode: 'en-US',
    flag: '🇺🇸'
  },
  'spanish': {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    speechCode: 'es-ES',
    flag: '🇪🇸'
  },
  'french': {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    speechCode: 'fr-FR',
    flag: '🇫🇷'
  },
  'german': {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    speechCode: 'de-DE',
    flag: '🇩🇪'
  },
  'italian': {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    speechCode: 'it-IT',
    flag: '🇮🇹'
  },
  'portuguese': {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    speechCode: 'pt-BR',
    flag: '🇧🇷'
  },
  'russian': {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    speechCode: 'ru-RU',
    flag: '🇷🇺'
  },
  'chinese': {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    speechCode: 'zh-CN',
    flag: '🇨🇳'
  },
  'japanese': {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    speechCode: 'ja-JP',
    flag: '🇯🇵'
  },
  'korean': {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    speechCode: 'ko-KR',
    flag: '🇰🇷'
  },
  'arabic': {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    speechCode: 'ar-SA',
    flag: '🇸🇦',
    rtl: true
  },
  'hindi': {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    speechCode: 'hi-IN',
    flag: '🇮🇳'
  }
};

// Map browser language codes to assistant language options
const BROWSER_TO_ASSISTANT_LANG_MAP: Record<string, string> = {
  'en': 'english',
  'es': 'spanish', 
  'fr': 'french',
  'de': 'german',
  'it': 'italian',
  'pt': 'portuguese',
  'ru': 'russian',
  'zh': 'chinese',
  'ja': 'japanese',
  'ko': 'korean',
  'ar': 'arabic',
  'hi': 'hindi'
};

export class LanguageManager {
  private static instance: LanguageManager;
  private currentLanguage: string = 'english';
  private listeners: Array<(language: string) => void> = [];

  private constructor() {
    this.currentLanguage = this.detectUserLanguage();
  }

  public static getInstance(): LanguageManager {
    if (!LanguageManager.instance) {
      LanguageManager.instance = new LanguageManager();
    }
    return LanguageManager.instance;
  }

  public detectUserLanguage(): string {
    // Check for stored preference first
    const stored = localStorage.getItem('talkweb-language');
    if (stored && SUPPORTED_LANGUAGES[stored]) {
      return stored;
    }

    // Detect from browser language
    const browserLang = navigator.language || navigator.languages?.[0] || 'en';
    const langCode = browserLang.split('-')[0].toLowerCase();
    const detectedLang = BROWSER_TO_ASSISTANT_LANG_MAP[langCode] || 'english';
    
    console.log('Language detection:', { browserLang, langCode, detectedLang });
    
    // Store the detected language
    this.setLanguage(detectedLang);
    
    return detectedLang;
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public getCurrentLanguageConfig(): LanguageConfig {
    return SUPPORTED_LANGUAGES[this.currentLanguage];
  }

  public setLanguage(language: string): void {
    if (!SUPPORTED_LANGUAGES[language]) {
      console.warn(`Unsupported language: ${language}, defaulting to English`);
      language = 'english';
    }

    this.currentLanguage = language;
    localStorage.setItem('talkweb-language', language);
    
    // Update document direction for RTL languages
    document.documentElement.dir = SUPPORTED_LANGUAGES[language].rtl ? 'rtl' : 'ltr';
    
    // Notify listeners
    this.listeners.forEach(listener => listener(language));
    
    console.log('Language changed to:', language, SUPPORTED_LANGUAGES[language]);
  }

  public getSpeechRecognitionLanguage(): string {
    return SUPPORTED_LANGUAGES[this.currentLanguage].speechCode;
  }

  public onLanguageChange(callback: (language: string) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public getAllLanguages(): Array<{ key: string; config: LanguageConfig }> {
    return Object.entries(SUPPORTED_LANGUAGES).map(([key, config]) => ({
      key,
      config
    }));
  }

  public isRTL(): boolean {
    return SUPPORTED_LANGUAGES[this.currentLanguage].rtl || false;
  }

  public getLanguageForWidget(): string {
    return this.currentLanguage;
  }
}

// Export singleton instance
export const languageManager = LanguageManager.getInstance();