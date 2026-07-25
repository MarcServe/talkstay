// Translation system for TalkWeb

type TranslationKey = 
  'language_selector_title' | 'language_selector_change_success' |
  'voice_instructions' | 'voice_listening' | 'voice_processing' | 'voice_no_forms' | 'voice_rescan' | 'voice_start_input' | 'voice_stop_listening' | 'voice_field_label' |
  'voice_booking_name' | 'voice_booking_email' | 'voice_booking_phone' | 'voice_booking_service' | 'voice_booking_date' | 'voice_booking_time' |
  'voice_form_name_placeholder' | 'voice_form_email_placeholder' | 'voice_form_phone_placeholder' | 'voice_form_message_placeholder' |
  'nav_features' | 'nav_pricing' | 'nav_dashboard' | 'nav_sign_in' | 'nav_get_started' | 'nav_start' |
  // Legacy support
  'voice.listening' | 'voice.processing' | 'voice.startConversation' | 'chat.close' | 'chat.send' | 'booking.confirm' | 'booking.edit' |
  'booking.name' | 'booking.email' | 'booking.phone' | 'booking.enterName' | 'booking.enterEmail' | 'booking.enterPhone' |
  'form.scanForForms' | 'form.fillWithVoice' | 'form.noFormsDetected' | 'form.refreshFields' |
  'error.speechRecognition' | 'error.voiceNotSupported' | 'language.select';

const TRANSLATIONS: Record<string, Record<TranslationKey, string>> = {
  'english': {
    'language_selector_title': 'Language',
    'language_selector_change_success': 'Language changed to English',
    'voice_instructions': 'Speak now to fill the form',
    'voice_listening': 'Listening...',
    'voice_processing': 'Processing...',
    'voice_no_forms': 'No forms found on this page',
    'voice_rescan': 'Rescan Page',
    'voice_start_input': 'Start Voice Input',
    'voice_stop_listening': 'Stop Listening',
    'voice_field_label': 'Field',
    'voice_booking_name': 'your name',
    'voice_booking_email': 'your email address',
    'voice_booking_phone': 'your phone number',
    'voice_booking_service': 'the service you need',
    'voice_booking_date': 'your preferred date',
    'voice_booking_time': 'your preferred time',
    'voice_form_name_placeholder': 'Enter your name',
    'voice_form_email_placeholder': 'Enter your email',
    'voice_form_phone_placeholder': 'Enter your phone number',
    'voice_form_message_placeholder': 'Enter your message',
    'nav_features': 'Features',
    'nav_pricing': 'Pricing',
    'nav_dashboard': 'Dashboard',
    'nav_sign_in': 'Sign In',
    'nav_get_started': 'Get Started',
    'nav_start': 'Start',
    // Legacy support
    'voice.listening': 'Listening...',
    'voice.processing': 'Processing...',
    'voice.startConversation': 'Start Voice Chat',
    'chat.close': 'Close',
    'chat.send': 'Send',
    'booking.confirm': 'Confirm Booking',
    'booking.edit': 'Edit',
    'booking.name': 'Name',
    'booking.email': 'Email',
    'booking.phone': 'Phone',
    'booking.enterName': 'Enter your full name',
    'booking.enterEmail': 'Enter your email address',
    'booking.enterPhone': 'Enter your phone number',
    'form.scanForForms': 'Scan for Forms',
    'form.fillWithVoice': 'Fill with Voice',
    'form.noFormsDetected': 'No forms detected on this page',
    'form.refreshFields': 'Refresh Fields',
    'error.speechRecognition': 'Speech recognition error. Please try again.',
    'error.voiceNotSupported': 'Voice recognition is not supported in this browser.',
    'language.select': 'Select Language'
  },
  'spanish': {
    'language_selector_title': 'Idioma',
    'language_selector_change_success': 'Idioma cambiado a Español',
    'voice_instructions': 'Habla ahora para llenar el formulario',
    'voice_listening': 'Escuchando...',
    'voice_processing': 'Procesando...',
    'voice_no_forms': 'No se encontraron formularios en esta página',
    'voice_rescan': 'Reescanear Página',
    'voice_start_input': 'Iniciar Entrada de Voz',
    'voice_stop_listening': 'Dejar de Escuchar',
    'voice_field_label': 'Campo',
    'voice_booking_name': 'tu nombre',
    'voice_booking_email': 'tu dirección de correo electrónico',
    'voice_booking_phone': 'tu número de teléfono',
    'voice_booking_service': 'el servicio que necesitas',
    'voice_booking_date': 'tu fecha preferida',
    'voice_booking_time': 'tu hora preferida',
    'voice_form_name_placeholder': 'Ingresa tu nombre',
    'voice_form_email_placeholder': 'Ingresa tu correo electrónico',
    'voice_form_phone_placeholder': 'Ingresa tu número de teléfono',
    'voice_form_message_placeholder': 'Ingresa tu mensaje',
    'nav_features': 'Características',
    'nav_pricing': 'Precios',
    'nav_dashboard': 'Panel',
    'nav_sign_in': 'Iniciar Sesión',
    'nav_get_started': 'Comenzar',
    'nav_start': 'Inicio',
    // Legacy support
    'voice.listening': 'Escuchando...',
    'voice.processing': 'Procesando...',
    'voice.startConversation': 'Iniciar Chat de Voz',
    'chat.close': 'Cerrar',
    'chat.send': 'Enviar',
    'booking.confirm': 'Confirmar Reserva',
    'booking.edit': 'Editar',
    'booking.name': 'Nombre',
    'booking.email': 'Correo',
    'booking.phone': 'Teléfono',
    'booking.enterName': 'Ingresa tu nombre completo',
    'booking.enterEmail': 'Ingresa tu correo electrónico',
    'booking.enterPhone': 'Ingresa tu número de teléfono',
    'form.scanForForms': 'Buscar Formularios',
    'form.fillWithVoice': 'Llenar con Voz',
    'form.noFormsDetected': 'No se detectaron formularios en esta página',
    'form.refreshFields': 'Actualizar Campos',
    'error.speechRecognition': 'Error de reconocimiento de voz. Inténtalo de nuevo.',
    'error.voiceNotSupported': 'El reconocimiento de voz no es compatible con este navegador.',
    'language.select': 'Seleccionar Idioma'
  },
  'french': {
    'language_selector_title': 'Langue',
    'language_selector_change_success': 'Langue changée en Français',
    'voice_instructions': 'Parlez maintenant pour remplir le formulaire',
    'voice_listening': 'Écoute...',
    'voice_processing': 'Traitement...',
    'voice_no_forms': 'Aucun formulaire trouvé sur cette page',
    'voice_rescan': 'Rescanner la Page',
    'voice_start_input': 'Démarrer l\'Entrée Vocale',
    'voice_stop_listening': 'Arrêter d\'Écouter',
    'voice_field_label': 'Champ',
    'voice_booking_name': 'votre nom',
    'voice_booking_email': 'votre adresse email',
    'voice_booking_phone': 'votre numéro de téléphone',
    'voice_booking_service': 'le service dont vous avez besoin',
    'voice_booking_date': 'votre date préférée',
    'voice_booking_time': 'votre heure préférée',
    'voice_form_name_placeholder': 'Entrez votre nom',
    'voice_form_email_placeholder': 'Entrez votre email',
    'voice_form_phone_placeholder': 'Entrez votre numéro de téléphone',
    'voice_form_message_placeholder': 'Entrez votre message',
    'nav_features': 'Fonctionnalités',
    'nav_pricing': 'Tarifs',
    'nav_dashboard': 'Tableau de Bord',
    'nav_sign_in': 'Se Connecter',
    'nav_get_started': 'Commencer',
    'nav_start': 'Début',
    // Legacy support
    'voice.listening': 'Écoute...',
    'voice.processing': 'Traitement...',
    'voice.startConversation': 'Démarrer Chat Vocal',
    'chat.close': 'Fermer',
    'chat.send': 'Envoyer',
    'booking.confirm': 'Confirmer Réservation',
    'booking.edit': 'Modifier',
    'booking.name': 'Nom',
    'booking.email': 'Email',
    'booking.phone': 'Téléphone',
    'booking.enterName': 'Entrez votre nom complet',
    'booking.enterEmail': 'Entrez votre adresse email',
    'booking.enterPhone': 'Entrez votre numéro de téléphone',
    'form.scanForForms': 'Rechercher Formulaires',
    'form.fillWithVoice': 'Remplir par Voix',
    'form.noFormsDetected': 'Aucun formulaire détecté sur cette page',
    'form.refreshFields': 'Actualiser Champs',
    'error.speechRecognition': 'Erreur de reconnaissance vocale. Veuillez réessayer.',
    'error.voiceNotSupported': 'La reconnaissance vocale n\'est pas prise en charge par ce navigateur.',
    'language.select': 'Sélectionner Langue'
  },
  'german': {
    'language_selector_title': 'Sprache',
    'language_selector_change_success': 'Sprache geändert zu Deutsch',
    'voice_instructions': 'Sprechen Sie jetzt, um das Formular auszufüllen',
    'voice_listening': 'Hört zu...',
    'voice_processing': 'Verarbeitung...',
    'voice_no_forms': 'Keine Formulare auf dieser Seite gefunden',
    'voice_rescan': 'Seite neu scannen',
    'voice_start_input': 'Spracheingabe starten',
    'voice_stop_listening': 'Aufhören zu hören',
    'voice_field_label': 'Feld',
    'voice_booking_name': 'Ihr Name',
    'voice_booking_email': 'Ihre E-Mail-Adresse',
    'voice_booking_phone': 'Ihre Telefonnummer',
    'voice_booking_service': 'der Service, den Sie benötigen',
    'voice_booking_date': 'Ihr bevorzugtes Datum',
    'voice_booking_time': 'Ihre bevorzugte Zeit',
    'voice_form_name_placeholder': 'Geben Sie Ihren Namen ein',
    'voice_form_email_placeholder': 'Geben Sie Ihre E-Mail ein',
    'voice_form_phone_placeholder': 'Geben Sie Ihre Telefonnummer ein',
    'voice_form_message_placeholder': 'Geben Sie Ihre Nachricht ein',
    'nav_features': 'Funktionen',
    'nav_pricing': 'Preise',
    'nav_dashboard': 'Dashboard',
    'nav_sign_in': 'Anmelden',
    'nav_get_started': 'Loslegen',
    'nav_start': 'Start',
    // Legacy support
    'voice.listening': 'Hört zu...',
    'voice.processing': 'Verarbeitung...',
    'voice.startConversation': 'Sprach-Chat starten',
    'chat.close': 'Schließen',
    'chat.send': 'Senden',
    'booking.confirm': 'Buchung bestätigen',
    'booking.edit': 'Bearbeiten',
    'booking.name': 'Name',
    'booking.email': 'E-Mail',
    'booking.phone': 'Telefon',
    'booking.enterName': 'Geben Sie Ihren vollständigen Namen ein',
    'booking.enterEmail': 'Geben Sie Ihre E-Mail-Adresse ein',
    'booking.enterPhone': 'Geben Sie Ihre Telefonnummer ein',
    'form.scanForForms': 'Formulare suchen',
    'form.fillWithVoice': 'Mit Stimme füllen',
    'form.noFormsDetected': 'Keine Formulare auf dieser Seite erkannt',
    'form.refreshFields': 'Felder aktualisieren',
    'error.speechRecognition': 'Spracherkennungsfehler. Bitte versuchen Sie es erneut.',
    'error.voiceNotSupported': 'Spracherkennung wird von diesem Browser nicht unterstützt.',
    'language.select': 'Sprache auswählen'
  },
  'chinese': {
    'language_selector_title': '语言',
    'language_selector_change_success': '语言已更改为中文',
    'voice_instructions': '现在说话来填写表单',
    'voice_listening': '正在聆听...',
    'voice_processing': '处理中...',
    'voice_no_forms': '在此页面上未找到表单',
    'voice_rescan': '重新扫描页面',
    'voice_start_input': '开始语音输入',
    'voice_stop_listening': '停止聆听',
    'voice_field_label': '字段',
    'voice_booking_name': '您的姓名',
    'voice_booking_email': '您的邮箱地址',
    'voice_booking_phone': '您的电话号码',
    'voice_booking_service': '您需要的服务',
    'voice_booking_date': '您首选的日期',
    'voice_booking_time': '您首选的时间',
    'voice_form_name_placeholder': '输入您的姓名',
    'voice_form_email_placeholder': '输入您的邮箱',
    'voice_form_phone_placeholder': '输入您的电话号码',
    'voice_form_message_placeholder': '输入您的留言',
    'nav_features': '功能',
    'nav_pricing': '价格',
    'nav_dashboard': '仪表板',
    'nav_sign_in': '登录',
    'nav_get_started': '开始使用',
    'nav_start': '开始',
    // Legacy support
    'voice.listening': '正在聆听...',
    'voice.processing': '处理中...',
    'voice.startConversation': '开始语音聊天',
    'chat.close': '关闭',
    'chat.send': '发送',
    'booking.confirm': '确认预订',
    'booking.edit': '编辑',
    'booking.name': '姓名',
    'booking.email': '邮箱',
    'booking.phone': '电话',
    'booking.enterName': '请输入您的全名',
    'booking.enterEmail': '请输入您的邮箱地址',
    'booking.enterPhone': '请输入您的电话号码',
    'form.scanForForms': '扫描表单',
    'form.fillWithVoice': '语音填写',
    'form.noFormsDetected': '此页面未检测到表单',
    'form.refreshFields': '刷新字段',
    'error.speechRecognition': '语音识别错误。请重试。',
    'error.voiceNotSupported': '此浏览器不支持语音识别。',
    'language.select': '选择语言'
  }
};

export class TranslationManager {
  private static instance: TranslationManager;
  private currentLanguage: string = 'english';

  private constructor() {}

  public static getInstance(): TranslationManager {
    if (!TranslationManager.instance) {
      TranslationManager.instance = new TranslationManager();
    }
    return TranslationManager.instance;
  }

  public setLanguage(language: string): void {
    if (TRANSLATIONS[language]) {
      this.currentLanguage = language;
    }
  }

  public t(key: TranslationKey, fallback?: string): string {
    const translation = TRANSLATIONS[this.currentLanguage]?.[key];
    return translation || fallback || TRANSLATIONS.english[key] || key;
  }

  public getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  public hasTranslation(language: string): boolean {
    return !!TRANSLATIONS[language];
  }
}

// Export singleton instance
export const translator = TranslationManager.getInstance();

// Hook for React components
export const useTranslation = () => {
  const t = (key: TranslationKey, fallback?: string) => translator.t(key, fallback);
  return { t };
};