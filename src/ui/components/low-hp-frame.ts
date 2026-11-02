// LowHpFrame：体力わずかの赤い枠（仕様書 §11.8）。HP × 5 ≦ 最大HP の間、#app のウィンドウの二重線を赤にする
import { isLowHp } from '../../logic/low-hp';
import type { Store } from '../store';

export function lowHpFrame(app: HTMLElement, store: Store): () => void {
  const render = () => {
    const c = store.game.state?.character;
    const low = !!c && isLowHp(c.hp, c.maxHp);
    if (low) {
      app.dataset.lowHp = 'true';
      app.style.setProperty('--wiz-window-line', 'var(--wiz-color-error)');
    } else {
      delete app.dataset.lowHp;
      app.style.removeProperty('--wiz-window-line');
    }
  };
  const off = store.subscribe(render);
  render();
  return off;
}
