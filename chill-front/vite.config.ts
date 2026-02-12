import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml: {
          order: 'pre',
          handler(html, ctx) {
            return html
              .replace(/G-XXXXXXXXXX/g, env.VITE_GA_MEASUREMENT_ID || 'G-PLACEHOLDER123')
              .replace(/XXXXXXXXXX/g, env.VITE_CLARITY_PROJECT_ID || 'placeholder_clarity_id')
              .replace(/XXXXXXX/g, env.VITE_HOTJAR_SITE_ID || 'placeholder_hotjar_id')
          },
        },
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            genai: ['@google/genai'],
          },
        },
      },
    },
  }
});
