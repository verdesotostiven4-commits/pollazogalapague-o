import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        app: path.resolve(__dirname, 'index.html'),
        cascada: path.resolve(__dirname, 'cascada.html'),
        customerMap: path.resolve(__dirname, 'mapa-cliente-lab.html'),
      },
    },
  },
});
