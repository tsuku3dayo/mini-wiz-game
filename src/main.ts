// 起動（仕様書 §27.2）。いまはテーマを読み、インストールの案内と更新を準備し、タイトルの仮の画面を出すだけ
// 保存・ゲーム API・ストア・ルーターは TASK-0005・0006 で足す
import './ui/theme.css';
import './ui/style.css';
import { prepareInstall } from './platform/install';
import { registerPwa } from './platform/pwa';
import { updateBanner } from './ui/components/update-banner';
import { attachDebug } from './ui/debug';
import { mountTitle } from './ui/screens/title';

if (new URLSearchParams(location.search).has('debug')) attachDebug();
prepareInstall();
const banner = updateBanner();
const app = document.getElementById('app');
if (app) {
  mountTitle(app);
  document.body.dataset.screen = 'title';
  document.body.dataset.location = 'none';
  // 更新の帯はタイトル・宿屋の画面のときだけ（いまはタイトルだけ）
  banner.setAllowed(true);
  registerPwa();
  window.__appStarted = true;
}
