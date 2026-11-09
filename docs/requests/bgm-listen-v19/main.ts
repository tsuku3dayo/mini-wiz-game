// 試聴ページ：ゲームと同じ再生の仕組み（src/audio/bgm.ts）で、v1.9 の案の曲を鳴らす
import { audioContext } from '../../../src/audio/sound.ts';
import { playBgm, stopBgm } from '../../../src/audio/bgm.ts';
import { BGM, loopSec } from './tracks-v19';

interface Item { key: string; label: string; scene: string; old: string; oldLabel: string; part: string }
interface Section { title: string; note: string; items: Item[] }
const SECTIONS: Section[] = [
  {
    title: 'ボス戦の候補（どれか 1 つを選んでください）',
    note: '「おお、運命の女神よ」（オルフ作）は 2052 年まで著作権があるため、雰囲気の近い著作権の切れた曲を作りました。D は B の暗い版です（「候補 B」のボタンで聴き比べられます）。',
    items: [
      { key: 'boss_verdi', label: 'A', scene: 'ボス戦', old: 'old_boss', oldLabel: 'いまの曲', part: '和音を叩きつけ、裏で大太鼓。弦が駆け下り、合唱が「怒りの日」と叫ぶ。運命の女神にいちばん近い迫力' },
      { key: 'boss_mozart', label: 'B', scene: 'ボス戦', old: 'old_boss', oldLabel: 'いまの曲', part: '弦が細かく刻み続ける上で、合唱が和音をそろえて打ち込む。速く引き締まった感じ' },
      { key: 'boss_chant', label: 'C', scene: 'ボス戦', old: 'old_boss', oldLabel: 'いまの曲', part: '中世の聖歌の旋律を合唱が歌い、鐘とオルガン。緊張を保つため低い弦の刻みと太鼓を足した。迫力より不気味さ' },
      { key: 'boss_mozart_dark', label: 'D', scene: 'ボス戦', old: 'boss_mozart', oldLabel: '候補 B', part: '候補 B を暗くした版。全体を低くし、明るい和音を暗い和音に替え、刻みを低い弦に。金属のうなりと鐘を足し、少し遅く' },
    ],
  },
  {
    title: '入れ替え（曲はいまのまま、流す場面を替える）',
    note: '曲の中身は変えません。新しい場面で聴いたときの感じを確かめてください。',
    items: [
      { key: 'title_new', label: '', scene: 'タイトル・名前入力', old: 'old_title', oldLabel: 'いまの曲', part: 'いまのボス戦の曲（カタコンベ）を、タイトルで流す' },
      { key: 'inn_new', label: '', scene: '宿屋', old: 'old_inn', oldLabel: 'いまの曲', part: 'いまのタイトルの曲（ローエングリン）を、宿屋で流す' },
    ],
  },
];

const meter = (bpb: number) => (bpb === 2.5 ? '5/8' : `${bpb}/4`);
let playing: string | null = null;
const root = document.getElementById('list')!;
const status = document.getElementById('status')!;

function render(): void {
  root.innerHTML = '';
  for (const sec of SECTIONS) {
    const h = document.createElement('h2');
    h.className = 'sec';
    h.textContent = sec.title;
    const p = document.createElement('p');
    p.className = 'note';
    p.textContent = sec.note;
    const ul = document.createElement('ul');
    ul.className = 'cards';
    for (const it of sec.items) {
      const t = BGM[it.key];
      const li = document.createElement('li');
      li.className = 'card' + (playing === it.key || playing === it.old ? ' on' : '');
      li.innerHTML = `
        <p class="scene">${it.label ? `候補 ${it.label}・` : ''}${it.scene}</p>
        <h3>${t.name}</h3>
        <p class="meta">${meter(t.bpb)}・テンポ ${t.bpm}・${t.bars} 小節で 1 周（約 ${Math.round(loopSec(t))} 秒）をくり返す</p>
        <p class="part">${it.part}</p>`;
      const row = document.createElement('div');
      row.className = 'row';
      row.append(button(playing === it.key ? '■ 止める' : it.label ? `▶ 候補 ${it.label}` : '▶ 新しい場面', it.key, 'main'));
      row.append(button(playing === it.old ? '■ 止める' : it.oldLabel, it.old, 'sub'));
      li.append(row);
      ul.append(li);
    }
    root.append(h, p, ul);
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
