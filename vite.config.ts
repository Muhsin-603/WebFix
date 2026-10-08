import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
        settings: resolve(__dirname, 'src/settings/settings.html'),
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/content-script': resolve(__dirname, 'src/content/content-script.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-extension-assets',
      closeBundle() {
        // Copy manifest.json to dist
        if (fs.existsSync('src/manifest.json')) {
          fs.copyFileSync('src/manifest.json', 'dist/manifest.json');
        }

        // Copy icons to dist/icons
        const iconDir = 'dist/icons';
        if (!fs.existsSync(iconDir)) {
          fs.mkdirSync(iconDir, { recursive: true });
        }
        if (fs.existsSync('src/icons/icon.svg')) {
          fs.copyFileSync('src/icons/icon.svg', `${iconDir}/icon.svg`);
        }
      },
    },
  ],
});
