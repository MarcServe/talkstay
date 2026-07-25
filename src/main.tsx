import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Auto-recover from stale chunk errors after a redeploy.
// When the browser has a cached index.js referencing a hashed chunk that no
// longer exists, dynamic import() rejects. Nuke SW caches and reload.
const RELOAD_KEY = '__chunk_reload_ts__';
const RELOAD_COOLDOWN_MS = 10_000;

async function nukeAndReload() {
  const now = Date.now();
  const last = Number(sessionStorage.getItem(RELOAD_KEY) || '0');
  if (now - last < RELOAD_COOLDOWN_MS) return; // avoid tight loop
  sessionStorage.setItem(RELOAD_KEY, String(now));
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister().catch(() => null)));
    }
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => null)));
    }
  } catch {
    /* ignore */
  }
  window.location.reload();
}

const isStaleChunkError = (msg: string) =>
  msg.includes('dynamically imported module') ||
  msg.includes('Failed to fetch dynamically imported module') ||
  /can't access property .+, .+ is undefined/.test(msg) ||
  /Cannot read propert(y|ies) of undefined/.test(msg) ||
  /_result is undefined/.test(msg);

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  void nukeAndReload();
});
window.addEventListener('error', (event) => {
  if (isStaleChunkError(event?.message || '')) void nukeAndReload();
});
window.addEventListener('unhandledrejection', (event) => {
  const msg = String((event as any)?.reason?.message || (event as any)?.reason || '');
  if (isStaleChunkError(msg)) void nukeAndReload();
});

createRoot(document.getElementById("root")!).render(<App />);


// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, app will work without PWA features
    });
  });
}
