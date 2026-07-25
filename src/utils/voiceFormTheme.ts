export type VoiceFormTheme = 'light' | 'dark' | 'auto';

/**
 * Applies the chosen Voice Form theme by toggling the `dark` class on <html>.
 * Returns a cleanup function that restores the original class state so the
 * host app's theme is not permanently altered (important when embedded).
 */
export function applyVoiceFormTheme(theme: VoiceFormTheme): () => void {
  if (typeof document === 'undefined') return () => {};
  const root = document.documentElement;
  const hadDark = root.classList.contains('dark');

  const mql = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

  const apply = () => {
    const wantsDark =
      theme === 'dark' || (theme === 'auto' && !!mql?.matches);
    root.classList.toggle('dark', wantsDark);
  };

  apply();

  let listener: ((e: MediaQueryListEvent) => void) | null = null;
  if (theme === 'auto' && mql) {
    listener = () => apply();
    try { mql.addEventListener('change', listener); } catch { mql.addListener(listener as any); }
  }

  return () => {
    if (listener && mql) {
      try { mql.removeEventListener('change', listener); } catch { mql.removeListener(listener as any); }
    }
    root.classList.toggle('dark', hadDark);
  };
}

export function isValidVoiceFormTheme(v: unknown): v is VoiceFormTheme {
  return v === 'light' || v === 'dark' || v === 'auto';
}
