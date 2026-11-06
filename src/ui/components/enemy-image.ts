// EnemyImage：戦闘の敵の絵（仕様書 §13.2）。256×256 をそのまま出す（ぼかさない）
// 読み込めないときは枠ごと消し、敵の名前だけに戻す（エラーは出さない。同じ部品の中では読み直さない）
import type { EnemyKind } from '../../api/types';
import { ENEMY_IMAGE_PX, enemyImageUrl } from '../../logic/enemy-image';
import { el } from '../dom';

export function enemyImage(opts: { kind: EnemyKind; name: string }): { el: HTMLElement; destroy(): void } {
  const img = el('img', { class: 'wiz-enemy-img', src: enemyImageUrl(opts.kind), alt: opts.name, width: ENEMY_IMAGE_PX, height: ENEMY_IMAGE_PX, decoding: 'async' });
  const frame = el('div', { class: 'wiz-enemy-image', 'data-testid': 'enemy-image-frame' }, img);
  img.addEventListener('error', () => frame.remove(), { once: true });
  return { el: frame, destroy: () => frame.remove() };
}
