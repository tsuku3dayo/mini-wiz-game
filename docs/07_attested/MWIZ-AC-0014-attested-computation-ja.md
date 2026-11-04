---
id: MWIZ-AC-0014
type: Attested Computation
title: 装備のルールとゲーム API の実施記録
status: review
version: 1.0
updated: 2026-11-02
sources:
  - MWIZ-TASK-0014（v1.1）
  - MWIZ-TC-0008（v1.0）
  - MWIZ-TC-0011（v1.1）
  - MWIZ-TC-0012（v1.0）
  - MWIZ-TC-0022（v1.0）
  - MWIZ-TC-0023（v1.0）
  - MWIZ-TC-0024（v1.0）
  - MWIZ-TC-0025（v1.0）
  - MWIZ-TC-0026（v1.0）
  - MWIZ-TC-0027（v1.0）
  - MWIZ-TC-0028（v1.0）
  - MWIZ-TC-0029（v1.0）
  - MWIZ-TC-0030（v1.0）
  - MWIZ-TD-0002（v1.6）
verified: null
---

# AC-0014 装備のルールとゲーム API の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0014](../06_plan/MWIZ-TASK-0014-implementation-task-ja.md) 装備のルールとゲーム API |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0014-items-rules` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの（画面は変えていない。そうび・もちもの・入れ替えの画面は TASK-0015）：

- `domain/equipment.ts`：`equip`（前の個体は所持品の末尾へ。満杯でもできる）・`unequip`（空き枠・満杯は 409 rule_violation）・`discard`・`itemLabel`、付け替え・はずすのあとの HP・MP の切り詰め（HP は最低 1、上限が上がっても増やさない）
- `domain/loot.ts`：`takeLoot`（捨てて拾う）・`abandonLoot`。ボスの後（thenClear）なら CLEARED と「ダンジョンに 平和が もどった」
- ゲーム API：`equip`・`unequip`・`discard`・`lootTake`・`lootAbandon`（引数の検査つき）。これでゲーム API の操作が仕様書 §22.2 の 20 個そろった
- テストの道具：`tests/helpers/autoplayer.ts`（自動プレイヤー。ゲーム API だけで遊ぶ）
- `e2e/helpers.ts`：シード `SEEDS.slimeDropR`（131）・`darkKnightDropLG`（66）。狙いどおりに落とすことを単体テストでも確かめる

この TASK より前にできていたもの：装備のマスタ・`conformItem`・実効値（TASK-0004）、ドロップの抽選と追加（TASK-0010 で前倒し）

設計の直し（TD-0002 v1.6）：`itemId`・`discardId` の違反の文（v1.0 の DTO の既定の文）、自動プレイヤーの `resume` と動き方を書いた。参照する成果物の版の表記を直した（承認済みの AC-0004〜0006・0008・0010・0012 は表記だけ）。

前の TASK のテストの名前の直し：TC-0009-06（`e2e/inn.spec.ts`）・TC-0010-04（`e2e/menu.spec.ts`）・TC-0011-10（`e2e/message.spec.ts`）で、確認 ID の後ろの空白が抜けていた（後ろが日本語なので数えには入っていた）。3 つとも空白を戻した。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0027-01 | 単体（`tests/domain/items.test.ts`） | OK。32 種の ID・名前・部位・段階・能力・幅が §8.2 の 4 つの表と一致、ソロモンのゆびわだけ能力 2 つ |
| TC-0027-02 | 単体（同上） | OK。エクスカリバー［LG］60・78、ロングソード［SR］10・12・13・15。32 種の範囲が §8.3 の表と一致 |
| TC-0029-10 | 単体（同上） | OK。ロングソード［N］8 → ［R］9、ショートソード［LG］30 → ［R］2、範囲の外は切り詰め、2 回目は同じ |
| TC-0027-03 | 単体（`tests/domain/loot.test.ts`） | OK。段階ごとのレアリティ、80 で低い方・81 で高い方、段階 8 は 81 でも LG で乱数 5 個 |
| TC-0027-04 | 単体（同上） | OK。スライムは 15 で落とし、16 では落とさず残りの乱数 4 個が減らない |
| TC-0027-05 | 単体（同上） | OK。ダークナイトは特例 5 で段階 8・LG（乱数 5 個で余りなし）、6 なら段階 5〜7 |
| TC-0027-06 | 単体（同上） | OK。ボスは 100 でも落とし、`int(8,8)` を 1 回引く |
| TC-0027-08 | 単体（同上） | OK。ドロップの行の形、ソロモンのゆびわは補正 2 つ、UR・LG だけ rareDrop |
| TC-0027-10 | 単体（同上） | OK。ID は nextId から、捨てた ID は使わない、満杯でも振り、あきらめても戻らない |
| TC-0030-01 | 単体（同上） | OK。50 個で落とすと SWAP・pending（thenClear false）で所持品は同じ。49 個＋装備 4 個なら末尾に入って 50 個・DUNGEON |
| TC-0030-05 | 単体（同上） | OK。拾う・あきらめるの結果と文、thenClear で CLEARED と「平和が もどった」、所持品にない ID（装備中を含む）は 409 |
| TC-0028-03 | 単体（`tests/domain/equipment.test.ts`） | OK。前の個体は末尾へ、個数は同じ、50 個でも付け替えられる、「バトルアックス［SR］を そうびした」 |
| TC-0028-05 | 単体（同上） | OK。50 個では「もちものが いっぱいで はずせない」、空き枠は「なにも そうびしていない」、49 個なら末尾へ「ガードリング［R］を はずした」 |
| TC-0028-07 | 単体（同上） | OK。40/45 → 外すと 30/30、MP 14 → 10、付けても 30 のまま、最低 1、捨てるは切り詰めない |
| TC-0028-12 | 単体（同上） | OK。ソロモンのゆびわ（20）で こうげき・ぼうぎょ が両方 20、外すと両方 0 |
| TC-0029-07 | 単体（同上） | OK。装備中の ID を捨てると「その もちものは ない」 |
| TC-0008-02 | 単体（`tests/domain/character.test.ts`） | OK。さいだいHP +15 で HP 10 → 61・MP 16、最大でも実行でき 1 行 |
| TC-0023-01 | 単体（`tests/domain/battle.test.ts`） | OK。ゴブリンでもボスでも、倒れると宿屋・61/61・Lv や装備や所持品は同じ・死亡 +1・最後の 2 行 |
| TC-0024-03 | 単体（同上） | OK。Lv12・1584 でボスを倒すと 10 行、effect の並び bossDefeat・levelUp ×3・rareDrop・clear、CLEARED |
| TC-0027-07 | 単体（同上） | OK。記録した乱数の引数の並び：スライムは 回避 → ダメージ → ドロップ → 部位 → 段階 → レアリティ → 補正値。ダークナイトでは成長 5 個のあとにドロップ → 特例 → 部位 → 段階 → レアリティ → 補正値 |
| TC-0024-08 | 単体（`tests/domain/balance.test.ts`） | OK。平均の成長・装備なしの Lv12 はシード 1〜200 で勝つ割合 20% 以下、weapon5・armor5・shield5・accessory4 の Lv10 は 80% 以上 |
| TC-0012-02 | 単体（`tests/api/game-api.test.ts`） | OK。§10.3 の 15 の操作それぞれ、許されない場所すべてで 409 invalid_state、保存は同じ |
| TC-0012-04 | 単体（同上） | OK。validation_error（details つき）・game_not_found・save_not_found・invalid_state・conflict・rule_violation・storage_error・internal_error が GameError で、details は 400 のときだけ |
| TC-0028-06 | 単体（同上） | OK。BATTLE・SWAP・CLEARED で equip・unequip・discard は 409、保存は同じ |
| TC-0029-08 | 単体（同上） | OK。セーブに装備・所持品・nextId、つづきからで戻る。SWAP から作ったセーブと自動セーブの pending は null |
| TC-0029-09 | 単体（同上） | OK。倒れても装備・所持品・nextId は同じ。startGame では空 |
| TC-0029-11 | 単体（同上） | OK。weapon9 は警告して取り除く、形の違う個体は黙って捨てる、所持品 null は空、nextId は取り除いた個体の id + 1 以上 |
| TC-0030-02 | 単体（同上） | OK。SWAP で 8 つの操作が 409、getGame の pendingDrop はいつも同じ個体 |
| TC-0030-07 | 単体（同上） | OK。50 個でボスを倒すと SWAP・laps 2・クリアの行なし・セーブなし。あきらめると CLEARED・クリアの行・laps 2 のまま・セーブを書く（pending null） |
| TC-0024-04 | 単体（同上） | OK。ボスを倒すとセーブが Lv15・2584・LG の個体・pending null・laps 2 で上書き、autoSaved true |
| TC-0024-06 | 単体（同上） | OK。セーブ・プレイ中状態のどちらが書けなくても 500 で両方とも前のまま。入れ替えで CLEARED になるときも同じ |
| TC-0024-05 | 単体（`tests/api/playthrough.test.ts`） | OK。シード 2026 で自動プレイヤーがボスを倒し CLEARED、セーブの実績・Lv がプレイ中状態と同じ |
| TC-0025-03 | 単体（同上） | OK。1 周目のあと、2 周目の出発で新しい 1F の入口に北向き。続けてボスを倒し laps 3・bossKills 2 |
| TC-0011-09 | E2E（`e2e/message.spec.ts`。pixel7・small・desktop） | OK。「かべだ」が `rgb(232, 220, 192)`、「たおした！」が `rgb(92, 214, 92)`、R のドロップが `rgb(91, 140, 255)`、LG のドロップが `rgb(255, 77, 109)`、「たおれた…」が `rgb(255, 90, 78)` |
| TC-0022-09 | E2E（`e2e/inn.spec.ts`） | OK。狭い画面は見出し「ゆうしゃ」、desktop は見出し「ステータス」と「なまえ ゆうしゃ」。Lv「  3」・EXP「 80（つぎまで 64）」・HP「 25/ 46」・MP「 10/ 16」・「  7」。さいだいHP +15 で「 25/ 61 (+15)」 |
| TC-0026-04 | E2E（`e2e/status.spec.ts`。pixel7・small） | OK。宿屋のメニューのステータスで、能力（「 25/ 61 (+15)」「 17 (+10)」）と実績、メッセージ欄なし、もどるでフォーカスが「メニュー」。ダンジョンからも開け、もどるでフォーカスが「≡ メニュー」 |

確認 ID のないテストも足した：E2E で使うシード（131・66）が狙いどおりに落とすこと。

手元で通したもの（2026-11-02）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID。テストにある確認 ID は 160 → 196 で、この TASK の 36 個の分だけ増えた）、単体 148 件、build、check:dist OK
- `npm run test:e2e`：229 件通った・26 件はその端末の対象外で飛ばした
- スクリーンショット：画面を変えていないので撮っていない

CI の結果（PR #50、2026-11-02）：`check`（verify）OK 41 秒、`e2e` OK 2 分 12 秒。マージのあと、main の test・pages も成功し、公開 URL が開くことを確かめた（TASK-0015 の PR で書き足した）。

## 3. 確認できなかったこと

- 手動の確認 ID はこの TASK にない（WS-0006 の手動の TC-0004-04 は TASK-0015 の担当）。
- 手元で、単体テストをほかのテストと同時に動かしたとき、生成の速さのテスト（TC-0013-06）と視界のテスト（TC-0014-06）が時間で 1 回失敗した（単独では通る）。視界のテストは時間切れを 30 秒にした。生成の速さは仕様の基準なので変えず、手元でまた起きたら記録する（CI では基準の 3 倍まで許す）。
- 段階 3 のバトルアックス［SR］のように、段階で出ないレアリティの個体は、読み込みの補正で直される（TC-0029-10 のとおり）。TC-0028 の E2E（TASK-0015）の材料は、段階で出るレアリティにする必要がある。

## 4. 後片付け

- シードを探すスクリプトは作業用の一時フォルダに置いた。
- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（画面の変更なし）
- [x] 設計と違う作りにしたら、TD・GUI を直した（TD-0002 v1.6）
- [x] AC-0014（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #50）
- [x] マージされた（マージ = 公開。2026-11-02、公開 URL が開くことを確かめた）
