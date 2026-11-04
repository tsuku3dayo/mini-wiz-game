// 音のオン／オフ設定（仕様書 §12.1「オン／オフ設定」、TD-0005 §1）
// 端末内保存のキー mini-wiz-game-sound に、文字列 'on'／'off' をそのまま（JSON にせず）書く。読めなければオフ
// 書けない（プライベートモードなど）ときは、開いている間だけ効く。エラーにしない

export const SOUND_STORAGE_KEY = 'mini-wiz-game-sound';

/** 読み書きに使う形（Web Storage の一部） */
export type SoundStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** メニューの項目名 */
export function soundLabel(on: boolean): string {
  return on ? 'おと：オン' : 'おと：オフ';
}

/** 保存の値を読む。'on' のときだけオン（なし・別の値・読めないはオフ） */
export function readSoundOn(storage: SoundStorage | null): boolean {
  try {
    return storage?.getItem(SOUND_STORAGE_KEY) === 'on';
  } catch {
    return false;
  }
}

export interface SoundSetting {
  readonly on: boolean;
  /** 切り替えて、新しい値を返す。オンにした瞬間に onTurnOn（確認音 toggle） */
  toggle(): boolean;
  subscribe(listener: () => void): () => void;
}

export function createSoundSetting(opts: { storage: SoundStorage | null; onTurnOn?: () => void }): SoundSetting {
  let on = readSoundOn(opts.storage);
  const listeners = new Set<() => void>();
  return {
    get on() { return on; },
    toggle() {
      on = !on;
      try {
        opts.storage?.setItem(SOUND_STORAGE_KEY, on ? 'on' : 'off');
      } catch {
        // 保存できなくても、その場では切り替える
      }
      listeners.forEach((l) => l());
      if (on) opts.onTurnOn?.();
      return on;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** window.localStorage（使えなければ null） */
export function browserStorage(): SoundStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
