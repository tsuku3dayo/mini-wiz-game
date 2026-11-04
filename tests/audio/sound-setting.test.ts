import { describe, expect, test, vi } from 'vitest';
import { createSoundSetting, readSoundOn, SOUND_STORAGE_KEY, soundLabel, type SoundStorage } from '../../src/audio/sound-setting';

/** メモリの保存（setItem を失敗させられる）。音の設定は文字列をそのまま書くので、Web Storage の形にする */
function memoryStorage(initial: Record<string, string> = {}, opts: { failWrite?: boolean; failRead?: boolean } = {}): SoundStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => {
      if (opts.failRead) throw new Error('SecurityError');
      return data.get(k) ?? null;
    },
    setItem: (k, v) => {
      if (opts.failWrite) throw new Error('QuotaExceededError');
      data.set(k, v);
    },
  };
}

describe('音の設定', () => {
  test('TC-0032-01 キーがない・off・別の値・読めないときはオフ、on のときだけオン', () => {
    expect(SOUND_STORAGE_KEY).toBe('mini-wiz-game-sound');
    expect(readSoundOn(memoryStorage())).toBe(false);
    expect(readSoundOn(memoryStorage({ [SOUND_STORAGE_KEY]: 'off' }))).toBe(false);
    expect(readSoundOn(memoryStorage({ [SOUND_STORAGE_KEY]: 'ON' }))).toBe(false);
    expect(readSoundOn(memoryStorage({ [SOUND_STORAGE_KEY]: '"on"' }))).toBe(false);
    expect(readSoundOn(memoryStorage({ [SOUND_STORAGE_KEY]: 'on' }, { failRead: true }))).toBe(false);
    expect(readSoundOn(null)).toBe(false);
    expect(readSoundOn(memoryStorage({ [SOUND_STORAGE_KEY]: 'on' }))).toBe(true);
    expect(createSoundSetting({ storage: memoryStorage({ [SOUND_STORAGE_KEY]: 'on' }) }).on).toBe(true);
    expect(soundLabel(true)).toBe('おと：オン');
    expect(soundLabel(false)).toBe('おと：オフ');

    // 切り替えると 'on'／'off' をそのまま書く。オンにしたときだけ onTurnOn
    const storage = memoryStorage();
    const onTurnOn = vi.fn();
    const setting = createSoundSetting({ storage, onTurnOn });
    const listener = vi.fn();
    setting.subscribe(listener);
    expect(setting.toggle()).toBe(true);
    expect(storage.data.get(SOUND_STORAGE_KEY)).toBe('on');
    expect(setting.toggle()).toBe(false);
    expect(storage.data.get(SOUND_STORAGE_KEY)).toBe('off');
    expect(onTurnOn).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  test('TC-0032-06 setItem が例外を投げても、toggle は例外を出さず、その場でオン／オフが切り替わる', () => {
    const onTurnOn = vi.fn();
    const setting = createSoundSetting({ storage: memoryStorage({}, { failWrite: true }), onTurnOn });
    expect(() => setting.toggle()).not.toThrow();
    expect(setting.on).toBe(true);
    expect(onTurnOn).toHaveBeenCalledTimes(1);
    expect(setting.toggle()).toBe(false);
    expect(setting.on).toBe(false);
  });
});
