// 試聴ページを 1 つの HTML にまとめる。再生の仕組みの曲データだけを、案の曲データに差し替える
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export default {
  root: here,
  base: './',
  logLevel: 'warn',
  resolve: {
    alias: [{ find: /^\.\.\/logic\/bgm-tracks$/, replacement: path.join(here, 'tracks-v19.ts') }],
  },
  build: { outDir: path.join(here, 'dist'), emptyOutDir: true, assetsInlineLimit: 100000000, modulePreload: false },
};
