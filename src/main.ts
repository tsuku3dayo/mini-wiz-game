// 起動（仕様書 §27.2）。今はテーマを読み、インストールの案内を準備し、タイトルの仮の画面を出すだけ。保存・ゲーム API・ルーターは TASK-0005・0006 で足す
import './ui/theme.css';
import './ui/style.css';
import { prepareInstall } from './platform/install';
import { mountTitle } from './ui/screens/title';

prepareInstall();
const app = document.getElementById('app');
if (app) {
  mountTitle(app);
  document.body.dataset.screen = 'title';
  document.body.dataset.location = 'none';
  window.__appStarted = true;
}
