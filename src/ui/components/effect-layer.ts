// EffectLayer：演出（仕様書 §11.8「演出」、GUI-0007 §1、TD-0003 §8）。キューの activeEffect を見て出す
// 画面全体の層（#effect-layer）：rareDrop・bossAppear・bossDefeat のときだけ出す
// levelUp：StatusPanel の外側を光らせる（行の拡大はメッセージ欄）。clear：クリア画面の見出し（screens/clear.ts）
// 動きを減らす設定では層にアニメーションを付けない（data-motion="reduced"。色の強調だけ）
import type { Rarity } from '../../api/types';
import { el } from '../dom';
import type { ActiveEffect, MessageQueue } from '../message-queue';

const LAYER_EFFECTS = new Set(['rareDrop', 'bossAppear', 'bossDefeat']);
const BOSS_SUFFIX = 'が あらわれた！';

/** bossAppear の行の文から、層の中央に出す敵の名前（末尾の「が あらわれた！」を取る） */
export function bossNameOf(text: string): string {
  return text.endsWith(BOSS_SUFFIX) ? text.slice(0, -BOSS_SUFFIX.length) : text;
}

const rarityClass = (r?: Rarity) => (r ? `rarity-${r.toLowerCase()}` : '');

export function effectLayer(opts: { queue: MessageQueue; reducedMotion: () => boolean; app: HTMLElement }): { el: HTMLElement; destroy(): void } {
  const { queue, app } = opts;
  const name = el('p', { class: 'effect-name' });
  const layer = el('div', { id: 'effect-layer', class: 'effect-layer', 'aria-hidden': 'true' }, name);
  document.body.append(layer);
  let shownSeq = 0;

  /** levelUp の間、出ている StatusPanel の外側を光らせる */
  function paintStatus(active: ActiveEffect | null) {
    const on = active?.effect === 'levelUp';
    app.querySelectorAll('[data-testid="status-panel"]').forEach((p) => {
      if (p.classList.contains('level-up') !== on) p.classList.toggle('level-up', on);
    });
  }
  // 画面を作り直したとき（遷移など）にも、levelUp の間は新しい StatusPanel に付け直す
  const observer = new MutationObserver(() => paintStatus(queue.activeEffect));
  observer.observe(app, { childList: true, subtree: true });

  function render() {
    const active = queue.activeEffect;
    paintStatus(active);
    if (!active || !LAYER_EFFECTS.has(active.effect)) {
      shownSeq = 0;
      layer.removeAttribute('data-effect');
      layer.removeAttribute('data-rarity');
      layer.className = 'effect-layer';
      name.textContent = '';
      return;
    }
    if (active.seq === shownSeq) return;
    shownSeq = active.seq;
    // 同じ種類の演出が続いても、アニメーションを頭から始め直す
    layer.removeAttribute('data-effect');
    void layer.offsetWidth;
    layer.dataset.motion = opts.reducedMotion() ? 'reduced' : 'full';
    layer.className = ['effect-layer', rarityClass(active.rarity)].filter(Boolean).join(' ');
    if (active.rarity) layer.dataset.rarity = active.rarity;
    else layer.removeAttribute('data-rarity');
    name.textContent = active.effect === 'bossAppear' ? bossNameOf(active.line.text) : '';
    layer.dataset.effect = active.effect;
  }

  layer.dataset.motion = opts.reducedMotion() ? 'reduced' : 'full';
  const off = queue.subscribe(render);
  render();
  return {
    el: layer,
    destroy() {
      off();
      observer.disconnect();
      layer.remove();
    },
  };
}
