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
  server: { port: 5173 },
  preview: { port: 5173 },
});
// cache-bust: linked @akku-work packages are re-optimised on config change
