// 効果音の試聴ページを作る（ゲームの効果音の仕組み src/audio/sound.ts を、いまの音として使う）
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
export default {
  root: here,
  base: './',
  logLevel: 'warn',
  build: { outDir: path.join(here, 'dist'), emptyOutDir: true, modulePreload: false },
};
