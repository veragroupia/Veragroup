import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      input: { principal: 'index.html', privacidade: 'privacidade.html' },
    },
  },
  server: { host: '127.0.0.1', port: 5173 },
});
