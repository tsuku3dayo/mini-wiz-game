---
id: MWIZ-TC-0023
type: Test Case
title: 倒れても宿屋で目覚める
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0023（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - docs/specification-ja.md (v1.2) §5.6、§7.3、§16.1、§16.4
verified: null
---

# TC-0023 倒れても宿屋で目覚める

- 対象：[US-0023](../02_requirements/MWIZ-US-0023-user-story-ja.md)（受け入れ条件 3 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0023-01 | 1 | HP が 0 になるターンの結果で、場所 INN・`dungeon` と `battle` が null。HP・MP が装備込みの最大（さいだいHP +15 のアクセを付けた Lv3 なら HP 61/61）。レベル・経験値・基礎値・装備・所持品は戦闘前と同じ。死亡回数が 1 増える。最後の 2 行が「ゆうしゃは たおれた…」（danger）・「気がつくと 宿屋に いた」（normal）。ボス戦で倒れても同じ | 単体 | `tests/domain/battle.test.ts` |
| TC-0023-02 | 2 | ゲーム API で倒れる操作をすると、経験値が増えず、所持品と `nextId` が変わらない（ドロップなし）。セーブ（`mini-wiz-game-save`）の中身が操作の前と同じ | 単体 | `tests/api/game-api.test.ts` |
| TC-0023-03 | 3 | 戦闘で倒れると、「ゆうしゃは たおれた…」を出すまでは `#/battle` のまま。この行を出した時点で宿屋（`#/inn`）に移り、宿屋のメッセージ欄に続けて「気がつくと 宿屋に いた」が出る。メッセージ欄は danger の行があるあいだ `variant="danger"`（外側の線が赤） | E2E | `e2e/battle.spec.ts` |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `dungeonState` で、HP 1 のキャラクターとゴブリン（速さ 6。先に攻撃する）との戦闘中の状態を作る。乱数は `SequenceRng`（回避の判定が外れる 100、ダメージ 0）。ゲーム API は `fake-storage.ts` にセーブを書いておく。
- E2E：`?debug=1` で開き、`startAt('BATTLE', …)` で HP 1 のキャラクターとゴブリンの戦闘から始める。`useSeed` で敵の攻撃が当たるシードにする。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0023-03 | 偽の時計を入れる →「たたかう」を選ぶ → 400ms ずつ進め、「ゆうしゃは たおれた…」の前の行までは `#/battle` → この行が出たら `#/inn` になる → さらに 400ms で宿屋のメッセージ欄の最後の行が「気がつくと 宿屋に いた」になる |

## 4. 手動の手順

なし。
