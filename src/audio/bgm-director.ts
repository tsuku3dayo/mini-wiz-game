// BGM の監督（仕様書 §26.7、TD-0005 §1）。画面に何も描かない
// 画面の切替え・ゲームの状態・演出・音の設定が変わるたびに、流す曲を決め直す。変わったら替えて、app:bgm を出す
// 起動時に 1 つだけ作る。ルーター（LocationGuard）の外に置くので、エラーの画面でも止めない
import { afterBoss, sceneBgm } from '../logic/bgm-scene';
import type { BgmName } from '../logic/bgm-tracks';
import type { MessageQueue } from '../ui/message-queue';
import type { Store } from '../ui/store';
import { playBgm, stopBgm } from './bgm';
import { sfxRemainingSec } from './sound';
import type { SoundSetting } from './sound-setting';

export interface BgmDirectorDeps {
  store: Store;
  queue: MessageQueue;
  sound: SoundSetting;
  /** いま出している画面のパス（'/inn' など。なければ null） */
  path: () => string | null;
}

export function createBgmDirector(deps: BgmDirectorDeps): { update(): void; destroy(): void } {
  const { store, queue, sound } = deps;
  /** いま流している曲（初めは無音） */
  let playing: BgmName | null = null;
  /** ボスを倒したあと、撃破の行（演出 bossDefeat）をもう出したか。宿屋に戻る（ボスのあとでなくなる）まで覚えておく */
  let defeatShown = false;

  function update() {
    // 撃破の行をもう出したか（とどめの一撃から撃破の演出までは止めておく。仕様書 §26.7）。
    // 画面を移る前にメッセージ欄が空になっても忘れないように、ボスのあとのあいだは覚えておく
    if (!afterBoss(store.game.state)) defeatShown = false;
    else if (queue.activeEffect?.effect === 'bossDefeat' || queue.lines.some((l) => l.effect === 'bossDefeat')) defeatShown = true;
    const want = sound.on ? sceneBgm(deps.path(), store.game.state, queue.activeEffect, defeatShown) : null;
    if (want === playing) return;
    playing = want;
    // 効果音が鳴っていれば、その残りのあとで始める（遭遇の音のあとに戦闘の曲など）
    if (want) playBgm(want, sfxRemainingSec());
    else stopBgm();
    try {
      window.dispatchEvent(new CustomEvent('app:bgm', { detail: { name: want } }));
    } catch {
      // 外に出さない
    }
  }

  const offs = [store.subscribe(update), queue.subscribe(update), sound.subscribe(update)];
  update();
  return {
    update,
    destroy: () => offs.forEach((off) => off()),
  };
}
