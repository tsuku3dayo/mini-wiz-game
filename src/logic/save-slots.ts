// セーブのスロットの一覧の文と初めのカーソル（仕様書 §11.5「スロットの一覧」、TD-0002 §2。v1.14）。DOM を使わない
import type { SaveSlot, SaveSlotSummary } from '../api/types';

export const SAVE_SLOT_NUMBERS: readonly SaveSlot[] = [1, 2, 3];

type Summary = Pick<SaveSlotSummary, 'name' | 'level'>;
type Slots = readonly (Pick<SaveSlotSummary, 'savedAt'> | null)[];

/** 「スロット{n}」のあとの区切り（全角スペース 1 つ） */
const SEP = '　';

/** 「スロット1{全角空白}ゆうしゃ Lv12」／「スロット2{全角空白}－ なし －」 */
export function slotLabel(slot: SaveSlot, summary: Summary | null): string {
  return `スロット${slot}${SEP}${summary ? `${summary.name} Lv${summary.level}` : '－ なし －'}`;
}

/** 上書きの確認の文「スロット1（ゆうしゃ Lv12）に うわがきしますか？」 */
export function overwriteText(slot: SaveSlot, summary: Summary): string {
  return `スロット${slot}（${summary.name} Lv${summary.level}）に うわがきしますか？`;
}

/** どれかのスロットにセーブがあるか */
export function hasAnySave(slots: Slots): boolean {
  return slots.some((s) => s !== null);
}

/** つづきから の初めのカーソル：いちばん新しくセーブした（savedAt が最も新しい）スロット。なければ 1 */
export function latestSlot(slots: Slots): SaveSlot {
  let best: SaveSlot = 1;
  let bestAt = '';
  slots.forEach((s, i) => {
    // ISO 8601（UTC・ミリ秒）の文字列なので、文字列の大小で比べられる。同じ時刻なら番号の小さい方
    if (s && s.savedAt > bestAt) {
      best = SAVE_SLOT_NUMBERS[i];
      bestAt = s.savedAt;
    }
  });
  return best;
}

/** セーブ の初めのカーソル：最後に使ったスロット → 最初の空き → 1 */
export function defaultSaveSlot(slots: Slots, saveSlot: SaveSlot | null): SaveSlot {
  if (saveSlot !== null) return saveSlot;
  const empty = slots.findIndex((s) => s === null);
  return empty === -1 ? 1 : SAVE_SLOT_NUMBERS[empty];
}
