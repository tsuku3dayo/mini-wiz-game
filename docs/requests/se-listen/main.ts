// 効果音の試聴ページ：いまの音（ビープ音風）と、FM 音源風の案を聴き比べる
import { audioContext, playSfx, stopSfx, type SfxName } from '../../../src/audio/sound.ts';
import { FRESH, freshDuration, patchOf, playFm, playFresh, stopFm, variantDuration, type Variant } from './sfx-fm';

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

const VARIANTS: { v: Variant; label: string; cls: string }[] = [
  { v: 'dark', label: '▶ 暗い案（短調・低め）', cls: 'main' },
  { v: 'darkTone', label: '音色だけ', cls: 'sub' },
  { v: 'wet', label: '湿った案', cls: 'sub' },
];
const NAME: Readonly<Record<Variant, string>> = { dark: '暗い案（短調・低め）', darkTone: '暗い音色だけ（音の並びはいまのまま）', wet: '湿った案', first: '最初の案' };

const list = document.getElementById('list')!;
const status = document.getElementById('status')!;

function unlock(): AudioContext | null {
  const ac = audioContext();
  if (ac && ac.state !== 'running') void ac.resume().catch(() => undefined);
  return ac;
}

for (const it of ITEMS) {
  // どの案も長さがいまと同じことを、作るときに確かめる（ずれていたら止まる）
  const ms = Math.max(...(['dark', 'darkTone', 'wet'] as const).map((v) => variantDuration(it.name, v)));
  const li = document.createElement('li');
  li.className = 'card';
  li.innerHTML = `
    <p class="scene">${it.when}</p>
    <h2>${it.label}</h2>
    <p class="meta">長さ ${(ms / 1000).toFixed(2)} 秒（どの案もいまと同じ）</p>
    <p class="meta">暗い案の音色：${patchOf(it.name, 'dark').name}${it.name === 'bossAppear' ? '（音の並びはもともと低いので、いまのまま）' : ''}</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  // まったく違う音（遭遇・ボス撃破・ゲームクリアだけ）
  (FRESH[it.name] ?? []).forEach((f, i) => {
    freshDuration(it.name, i);
    const p = document.createElement('p');
    p.className = 'meta fresh';
    p.innerHTML = `<b>${f.title}</b>：${f.desc}`;
    li.append(p);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'main';
    b.textContent = `▶ ${f.title.split('：')[0]}`;
    b.addEventListener('click', () => {
      const ac = unlock();
      if (!ac) return;
      stopSfx();
      playFresh(ac, it.name, i);
      status.textContent = `${f.title}：${it.label}`;
    });
    row.append(b);
  });
  for (const { v, label, cls } of VARIANTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = FRESH[it.name] ? 'sub' : cls;
    // 新しい音のある 3 つは、暗い案を小さいボタンにして名前を短く
    b.textContent = FRESH[it.name] ? (v === 'dark' ? '暗い案' : label) : label;
    b.addEventListener('click', () => {
      const ac = unlock();
      if (!ac) return;
      stopSfx();
      playFm(ac, it.name, v);
      status.textContent = `${NAME[v]}：${it.label}`;
    });
    row.append(b);
  }
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
  row.append(old);
  li.append(row);
  list.append(li);
}
status.textContent = 'ボタンを押すと鳴ります';
