// 更新の帯（仕様書 §11.12・§30.3、GUI-0007 §2）
// 新しい版を受け取ったら、タイトル・宿屋の画面のときだけ、画面の上端に「新しい版があります」と「更新」を出す
import { applyUpdate, hasUpdate, onUpdateAvailable } from '../../platform/pwa';
import { el } from '../dom';

export interface UpdateBanner {
  /** 帯を出してよい画面か（ルーターが画面を替えるたびに知らせる） */
  setAllowed(allowed: boolean): void;
  destroy(): void;
}

export function updateBanner(): UpdateBanner {
  let allowed = false;
  const button = el('button', { id: 'update-button', class: 'wiz-button', type: 'button' }, '更新');
  const banner = el('div', { id: 'update-banner', class: 'update-banner', role: 'status', hidden: true }, el('span', {}, '新しい版があります'), button);
  button.addEventListener('click', () => {
    button.disabled = true;
    void applyUpdate();
  });
  const render = () => { banner.hidden = !(allowed && hasUpdate()); };
  const stop = onUpdateAvailable(render);
  document.body.append(banner);
  return {
    setAllowed(next) {
      allowed = next;
      render();
    },
    destroy() {
      stop();
      banner.remove();
    },
  };
}
