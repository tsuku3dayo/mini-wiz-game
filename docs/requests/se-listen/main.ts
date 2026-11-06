// 効果音の試聴ページ：いまの音（ビープ音風）と、FM 音源風の案を聴き比べる
import { audioContext, playSfx, sfxDuration, stopSfx, type SfxName } from '../../../src/audio/sound.ts';
import { patchOf, playFm, stopFm, type Variant } from './sfx-fm';

const ITEMS: { name: SfxName; label: string; when: string }[] = [
  { name: 'encounter', label: '遭遇', when: 'ダンジョンで敵に出会ったとき' },
  { name: 'levelUp', label: 'レベルアップ', when: '「レベルが あがった！」の行' },
  { name: 'rareDrop', label: 'レアなドロップ', when: 'UR の装備を拾ったとき' },
  { name: 'rareDropLG', label: 'レジェンドのドロップ', when: 'LG（レジェンド）の装備を拾ったとき' },
  { name: 'bossAppear', label: 'ボス出現', when: 'ボスが あらわれたとき' },
  { name: 'bossDefeat', label: 'ボス撃破', when: 'ボスを倒したとき' },
  { name: 'clear', label: 'ゲームクリア', when: 'クリア画面の「平和が もどった」の行（ゲームでは演出の 1.5 秒で止まる）' },
  { name: 'toggle', label: 'おと：オン', when: '音をオンにしたとき' },
];

const list = document.getElementById('list')!;
const status = document.getElementById('status')!;

function unlock(): AudioContext | null {
  const ac = audioContext();
  if (ac && ac.state !== 'running') void ac.resume().catch(() => undefined);
  return ac;
}

for (const it of ITEMS) {
  const li = document.createElement('li');
  li.className = 'card';
  li.innerHTML = `
    <p class="scene">${it.when}</p>
    <h2>${it.label}</h2>
    <p class="meta">長さ ${(sfxDuration(it.name) / 1000).toFixed(2)} 秒（いまと同じ）</p>
    <p class="meta">湿った案：${patchOf(it.name, 'wet').name}／最初の案：${patchOf(it.name, 'first').name}</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  const fmButton = (variant: Variant, label: string, cls: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.textContent = label;
    b.addEventListener('click', () => {
      const ac = unlock();
      if (!ac) return;
      stopSfx();
      playFm(ac, it.name, variant);
      status.textContent = `${variant === 'wet' ? '湿った案' : '最初の案'}：${it.label}`;
    });
    return b;
  };
  const fm = fmButton('wet', '▶ 湿った案', 'main');
  const first = fmButton('first', '最初の案', 'sub');
  const old = document.createElement('button');
  old.type = 'button';
  old.className = 'sub';
  old.textContent = 'いまの音';
  old.addEventListener('click', () => {
    unlock();
    stopFm();
    playSfx(it.name);
    status.textContent = `いまの音（ビープ音風）：${it.label}`;
  });
  row.append(fm, first, old);
  li.append(row);
  list.append(li);
}
status.textContent = 'ボタンを押すと鳴ります';
