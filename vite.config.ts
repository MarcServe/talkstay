import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  // PWA on by default (staff install to home screen + notifications); set
  // ENABLE_PWA=false to opt out for a build.
  const enablePWA = process.env.ENABLE_PWA !== 'false';
  const shouldAnalyze = process.env.ANALYZE_BUNDLE === 'true';

  const plugins = [
    react(),
  ];

  if (shouldAnalyze) {
    const { visualizer } = await import('rollup-plugin-visualizer');
    plugins.push(
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
      })
    );
  }

  if (enablePWA) {
    plugins.push(
      VitePWA({
      // Our own service worker (public/sw.js) handles web-push AND precache.
      // injectManifest lets vite inject the built asset list into it.
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['icons/*.png', 'favicon.ico', 'favicon-32.png', 'favicon-48.png', 'lovable-uploads/*.png', 'lovable-uploads/*.jpg'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,woff2}', 'icons/*.png', 'favicon.ico', 'favicon-32.png', 'favicon-48.png'],
        // Don't precache inherited TalkWeb marketing imagery — keeps install lean.
        globIgnores: ['**/lovable-uploads/**', '**/assets/*.{png,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
      },
      manifest: {
        name: 'TalkStay by TalkWeb',
        short_name: 'TalkStay',
        description: 'Scan. Speak. Consider it done. Voice-first guest service for your stay.',
        theme_color: '#7c3aed',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/app',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
        ],
      },
    })
    );
  }

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: plugins.filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
