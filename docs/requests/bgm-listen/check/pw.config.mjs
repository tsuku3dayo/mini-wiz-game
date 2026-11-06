// 使い方：プロジェクトの外の一時フォルダに bgm-listen を写し、NODE_PATH をプロジェクトの node_modules にして
// npx --prefix <プロジェクト> playwright test -c pw.config.mjs（先に vite build -c ../vite.config.mjs）
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const project = process.env.PROJECT_DIR ?? '';
export default {
  testDir: '.',
  reporter: 'line',
  use: { baseURL: 'http://localhost:4174/' },
  webServer: {
    command: `npx --prefix "${project}" vite preview -c vite.config.mjs --port 4174 --strictPort`,
    cwd: path.join(here, '..'),
    url: 'http://localhost:4174',
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects: [
    { name: 'small', use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  ],
};
