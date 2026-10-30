// 起動（仕様書 §27.2）。TASK-0001 ではテーマを読み、タイトルの仮の画面を出すだけ。保存・ゲーム API・ルーターは TASK-0005・0006 で足す
import './ui/theme.css';
import './ui/style.css';
import { mountTitle } from './ui/screens/title';

const app = document.getElementById('app');
if (app) {
  mountTitle(app);
  document.body.dataset.screen = 'title';
  document.body.dataset.location = 'none';
  window.__appStarted = true;
}
