import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');

async function buildAll() {
  console.log('[WebFix Build] Starting multi-target build...');

  // 1. Build Popup and Settings HTML entries
  console.log('[WebFix Build] 1/3 Building Popup and Settings HTML...');
  await build({
    configFile: false,
    root: resolve(rootDir, 'src'),
    base: './',
    build: {
      outDir: resolve(rootDir, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'src/popup/popup.html'),
          settings: resolve(rootDir, 'src/settings/settings.html'),
        },
        output: {
          entryFileNames: '[name]/[name].js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              if (assetInfo.name.includes('popup')) return 'popup/popup.css';
              if (assetInfo.name.includes('settings')) return 'settings/settings.css';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
    },
  });

  // 2. Build Content Script as self-contained IIFE (no imports, no external chunks)
  console.log('[WebFix Build] 2/3 Bundling Content Script (self-contained IIFE)...');
  await build({
    configFile: false,
    build: {
      outDir: resolve(rootDir, 'dist/content'),
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/content/content-script.ts'),
        name: 'WebFixContent',
        formats: ['iife'],
        fileName: () => 'content-script.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 3. Build Service Worker as standalone bundle
  console.log('[WebFix Build] 3/3 Bundling Background Service Worker...');
  await build({
    configFile: false,
    build: {
      outDir: resolve(rootDir, 'dist/background'),
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/background/service-worker.ts'),
        name: 'WebFixBackground',
        formats: ['es'],
        fileName: () => 'service-worker.js',
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });

  // 4. Copy manifest and icons
  console.log('[WebFix Build] Copying manifest.json and icon assets...');
  fs.copyFileSync(
    resolve(rootDir, 'src/manifest.json'),
    resolve(rootDir, 'dist/manifest.json')
  );

  const iconsDist = resolve(rootDir, 'dist/icons');
  if (!fs.existsSync(iconsDist)) {
    fs.mkdirSync(iconsDist, { recursive: true });
  }
  fs.copyFileSync(
    resolve(rootDir, 'src/icons/icon.svg'),
    resolve(iconsDist, 'icon.svg')
  );

  console.log('[WebFix Build] Build completed successfully into dist/');
}

buildAll().catch((err) => {
  console.error('[WebFix Build] Error:', err);
  process.exit(1);
});
