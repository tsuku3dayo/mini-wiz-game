// 場面から曲を選ぶ（仕様書 §12.2「場面と曲」「切り替えの規則」、§26.7）。DOM・時刻に触れない
import type { GameView, MessageEffect } from '../api/types';
import type { BgmName } from './bgm-tracks';

/** ボスを倒したあと宿屋に戻るまで：場所が CLEARED、または SWAP でダンジョンがない（ボス撃破の入れ替え）。v1.7 からクリアの曲を流す */
export function afterBoss(state: GameView | null): boolean {
  return state?.location === 'CLEARED' || (state?.location === 'SWAP' && state.dungeon === null);
}

/**
 * 画面のパス（'/inn' など）・ゲームの状態・再生中の演出から、流す曲を決める。なし（無音）は null。
 * ボスの出現・撃破の演出のあいだは止める。
 * defeatShown：撃破の行（演出 bossDefeat）をもう出したか。とどめの一撃のあと撃破の行が出るまで（戦闘の画面）は止めておき、
 * 撃破の演出のあとからクリアの曲にする（v1.7）
 */
export function sceneBgm(
  pathname: string | null,
  state: GameView | null,
  active: { effect: MessageEffect } | null,
  defeatShown = true,
): BgmName | null {
  if (active?.effect === 'bossAppear' || active?.effect === 'bossDefeat') return null;
  if (afterBoss(state)) return pathname === '/battle' && !defeatShown ? null : 'clear';
  switch (pathname) {
    case '/':
    case '/new':
      return 'title';
    case '/inn':
      return 'inn';
    case '/dungeon':
    case '/swap':
      return 'dungeon';
    case '/battle':
      return state?.battle?.isBoss ? 'boss' : 'battle';
    default:
      return null;
  }
}
