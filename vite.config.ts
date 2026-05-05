import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

function safePublicCopy(): Plugin {
  return {
    name: 'safe-public-copy',
    apply: 'build',
    async closeBundle() {
      const publicDir = path.resolve(__dirname, 'public');
      const distDir = path.resolve(__dirname, 'dist');
      if (!fs.existsSync(publicDir)) return;

      const imageExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.avif'];
      const staticFiles = ['_redirects', 'sw.js', 'manifest.json'];

      function copyDir(srcDir: string, destDir: string) {
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const entries = fs.readdirSync(srcDir);
        for (const entry of entries) {
          const src = path.join(srcDir, entry);
          const dest = path.join(destDir, entry);
          try {
            const stat = fs.statSync(src);
            if (stat.isDirectory() && entry !== 'src') {
              copyDir(src, dest);
            } else if (stat.isFile()) {
              const ext = path.extname(entry).toLowerCase();
              if (imageExts.includes(ext) || staticFiles.includes(entry)) {
                fs.copyFileSync(src, dest);
              }
            }
          } catch {
          }
        }
      }

      copyDir(publicDir, distDir);
    },
  };
}

export default defineConfig({
  root: path.resolve(__dirname, 'public'),
  envDir: path.resolve(__dirname),
  plugins: [react(), safePublicCopy()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    copyPublicDir: false,
  },
});
