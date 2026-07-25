import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const enablePWA = process.env.ENABLE_PWA === 'true';
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
      registerType: 'autoUpdate',
      includeAssets: ['lovable-uploads/*.png', 'lovable-uploads/*.jpg'],
      manifest: {
        name: 'TalkStay by TalkWeb',
        short_name: 'TalkStay',
        description: 'Scan. Speak. Consider it done. Voice-first guest service for your stay.',
        theme_color: '#9b87f5',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/favicon.ico',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              }
            }
          }
        ]
      }
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
