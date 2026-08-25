import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // shadcn/ui generates imports as `@/components/ui/...`, so the alias is a hard requirement
    // rather than a convenience.
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@shared': path.resolve(import.meta.dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
    // `api/subject-token.ts` is a serverless function and `vite dev` does not run serverless
    // functions, so the SDK's very first token request 404s locally and NO consent surface can work —
    // the preference centre reports a failed read and every collection point stays silent. Forwarding
    // /api to the deployment fixes that, and it is sound here specifically because that deployment
    // signs for the SAME site and the SAME registered application this app points at. Change either
    // and the tokens stop verifying; see VITE_AKKU_SITE_KEY / VITE_AKKU_APP_ID in .env.local.
    //
    // Set VITE_TOKEN_ORIGIN to point somewhere else — a locally-run signer, or another deployment.
    proxy: {
      '/api': {
        target: process.env.VITE_TOKEN_ORIGIN ?? 'https://consent-banking.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  preview: { port: 5173 },
});
// cache-bust: linked @akku-work packages are re-optimised on config change
