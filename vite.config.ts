import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

// アプリ識別子（保存のキー・キャッシュ・起動の復旧の範囲）と版は package.json だけに書く（仕様書 §19.1）
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { name: string; version: string };

// index.html の __APP_ID__ を識別子に置き換える。ビルドを通らない public/boot.js が <meta name="app-id"> から読むため（仕様書 §19.2）
function appIdMeta(): Plugin {
  return {
    name: 'app-id-meta',
    transformIndexHtml: (html) => html.replaceAll('__APP_ID__', pkg.name),
  };
}

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_ID__: JSON.stringify(pkg.name),
  },
  plugins: [
    appIdMeta(),
    VitePWA({
      registerType: 'prompt',
      // 登録は src/platform/pwa.ts が行う（本番のビルドだけ。仕様書 §30.3）。自動で登録のスクリプトを足さない
      injectRegister: false,
      includeAssets: ['icons/icon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'WIZ',
        short_name: 'WIZ',
        description: '宿屋を拠点に、5 階層の迷宮を探索する 1 人用のダンジョン RPG',
        lang: 'ja',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        theme_color: '#0B0A0F',
        background_color: '#0B0A0F',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  server: { host: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
