import { fileURLToPath } from 'node:url';
import path from 'node:path';

// 使い方：NODE_PATH をプロジェクトの node_modules、PROJECT_DIR をプロジェクトにして npx --prefix <プロジェクト> playwright test -c pw.config.mjs
const here = path.dirname(fileURLToPath(import.meta.url));
const project = process.env.PROJECT_DIR ?? '';
export default {
  testDir: '.',
  reporter: 'line',
  use: { baseURL: 'http://localhost:4175/' },
  webServer: {
    command: `npx --prefix "${project}" vite preview -c vite.config.mjs --port 4175 --strictPort`,
    cwd: path.join(here, '..'),
    url: 'http://localhost:4175',
    reuseExistingServer: false,
    timeout: 60000,
  },
  projects: [{ name: 'small', use: { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }],
};
