// Environment configuration for staging/production separation
export type Environment = 'development' | 'staging' | 'production';

export const getEnvironment = (): Environment => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return 'development';
  }
  
  if (hostname.includes('staging.') || hostname.includes('dev.') || hostname.includes('test.')) {
    return 'staging';
  }
  
  // TalkStay production hosts (subdomain of talkweb.io)
  if (hostname === 'talkstay.talkweb.io' || hostname === 'www.talkstay.talkweb.io') {
    return 'production';
  }
  
  // Lovable preview domains should be treated as staging for testing
  if (hostname.endsWith('.lovable.app') || hostname.endsWith('.lovableproject.com')) {
    return 'staging';
  }
  
  return 'production';
};

/**
 * Canonical PUBLIC base URL that guest QR codes must always encode — regardless
 * of where the dashboard is opened (localhost, a Vercel preview, etc.). A printed
 * QR must resolve on a guest's phone, so it can never contain localhost.
 * Override per-deployment with VITE_PUBLIC_BASE_URL.
 */
export const getPublicBaseUrl = (): string => {
  const fromEnv = (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined)?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  return 'https://talkstay.talkweb.io';
};

export const isProduction = () => getEnvironment() === 'production';
export const isStaging = () => getEnvironment() === 'staging';
export const isDevelopment = () => getEnvironment() === 'development';

// Environment-specific configurations
// widgetUrl is the embeddable <script> src for the inherited TalkWeb widget
// screens. Those screens aren't routed in TalkStay, but they interpolated
// config.widgetUrl into copy-paste embed snippets — so without this they were
// rendering the string "undefined" into anything a user copied.
export const ENVIRONMENT_CONFIG = {
  development: {
    baseUrl: 'http://localhost:8080',
    supabaseUrl: 'https://oujqkygfmyapmrgxmhvt.supabase.co',
    widgetUrl: 'http://localhost:8080/widget.js',
  },
  staging: {
    baseUrl: 'https://staging.talkstay.talkweb.io',
    supabaseUrl: 'https://oujqkygfmyapmrgxmhvt.supabase.co',
    widgetUrl: 'https://staging.talkstay.talkweb.io/widget.js',
  },
  production: {
    baseUrl: 'https://talkstay.talkweb.io',
    supabaseUrl: 'https://oujqkygfmyapmrgxmhvt.supabase.co',
    widgetUrl: 'https://talkstay.talkweb.io/widget.js',
  }
};

export const getCurrentConfig = () => {
  const config = ENVIRONMENT_CONFIG[getEnvironment()];

  // On Vercel preview/localhost, base the URL on the live host so QR links resolve.
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  if (hostname.endsWith('.vercel.app') || hostname.includes('localhost')) {
    return {
      ...config,
      baseUrl: `${window.location.protocol}//${window.location.host}`,
    };
  }

  return config;
};