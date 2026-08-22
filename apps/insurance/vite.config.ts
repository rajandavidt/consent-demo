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
  server: { port: 5300 },
  preview: { port: 5300 },
});
// touched to force optimizeDeps after the consent-auth repoint
