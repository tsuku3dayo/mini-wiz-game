// 試聴ページ：ゲームと同じ再生の仕組み（src/audio/bgm.ts）で、v1.7 の案の曲を鳴らす
import { audioContext } from '../../../src/audio/sound.ts';
import { playBgm, stopBgm } from '../../../src/audio/bgm.ts';
import { BGM, loopSec } from './tracks-v17';

interface Item { key: string; scene: string; old?: string; part: string }
const ITEMS: Item[] = [
  { key: 'title', scene: 'タイトル・名前入力', old: 'old_title', part: '高い弦の和音の上で、旋律がゆっくり上っていく（冒頭の雰囲気に寄せた）' },
  { key: 'dungeon', scene: 'ダンジョン', old: 'old_dungeon', part: '低い弦が 5 拍子で揺れる（舟をこぐ動き）。後半に「怒りの日」の旋律' },
  { key: 'battle', scene: '戦闘', old: 'old_battle', part: '5 拍子のくり返し（タタタ・ターン・ターン・タタ・ターン）の上で金管が吹く' },
  { key: 'boss', scene: 'ボス戦', old: 'old_boss', part: '重い金管の和音を、強い音・弱い音と交互に。緊張を保つため低い太鼓を足した' },
  { key: 'clear', scene: 'ボス撃破・クリア（新しい場面）', part: 'オルガンの細かい分散和音の上で、ソプラノが静かに歌う' },
  { key: 'inn', scene: '宿屋', old: 'old_inn', part: '民謡の旋律を笛で、ハープの伴奏（伴奏はこのゲーム用の自前の編曲）' },
];

const meter = (bpb: number) => (bpb === 2.5 ? '5/8' : `${bpb}/4`);
let playing: string | null = null;
const list = document.getElementById('list')!;
const status = document.getElementById('status')!;

function render(): void {
  list.innerHTML = '';
  for (const it of ITEMS) {
    const t = BGM[it.key];
    const li = document.createElement('li');
    li.className = 'card' + (playing === it.key || playing === it.old ? ' on' : '');
    li.innerHTML = `
      <p class="scene">${it.scene}</p>
      <h2>${t.name}</h2>
      <p class="meta">${meter(t.bpb)}・テンポ ${t.bpm}・${t.bars} 小節で 1 周（約 ${Math.round(loopSec(t))} 秒）をくり返す</p>
      <p class="part">${it.part}</p>`;
    const row = document.createElement('div');
    row.className = 'row';
    row.append(button(playing === it.key ? '■ 止める' : '▶ 新しい曲', it.key, 'main'));
    if (it.old) row.append(button(playing === it.old ? '■ 止める' : 'いまの曲', it.old, 'sub'));
    li.append(row);
    list.append(li);
  }
  status.textContent = playing ? `再生中：${BGM[playing].name}` : '止まっています';
}

function button(label: string, key: string, cls: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', () => {
    const ac = audioContext();
    if (ac && ac.state !== 'running') void ac.resume().catch(() => undefined);
    if (playing === key) {
      stopBgm();
      playing = null;
    } else {
      playBgm(key as never);
      playing = key;
    }
    render();
  });
  return b;
}

document.getElementById('stop')!.addEventListener('click', () => {
  stopBgm();
  playing = null;
  render();
});
render();
