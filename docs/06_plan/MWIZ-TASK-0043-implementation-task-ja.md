---
id: MWIZ-TASK-0043
type: Implementation Task
title: 遭遇の入力止め・帰還でマップを残す・アイコン（仕様書 v1.22）
status: stable
version: 1.0
updated: 2026-11-13
sources:
  - MWIZ-WS-0025（v1.0）
  - MWIZ-TD-0002（v1.11）
  - MWIZ-TD-0003（v1.8）
  - MWIZ-TD-0005（v1.14）
  - MWIZ-TC-0002（v1.2）
  - MWIZ-TC-0011（v1.4）
  - MWIZ-TC-0013（v1.1）
  - MWIZ-TC-0017（v1.1）
  - MWIZ-TC-0018（v1.5）
verified: null
---

# TASK-0043 遭遇の入力止め・帰還でマップを残す・アイコン

- WS：[WS-0025](MWIZ-WS-0025-workstream-ja.md)
- ブランチ：`feat/TASK-0043-lock-keepmap-icon`
- 実施記録：AC-0043（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0042

## やること

04 で仮に当てたコードの差分（作業用の一時フォルダの `v122-draft-src.patch`）があれば当ててから始めてよい（なければ下の TD から作る）。

- 遭遇の入力止め（TD-0003 v1.8）：`src/logic/message-plan.ts` の `ENCOUNTER_LOCK_MS.normal` を 1000 に。コメントの「遭遇の音の長さ」を直す
- 帰還でマップを残す（TD-0002 §1.10）：
  - `src/domain/explore.ts`：`returnToInn` は `dungeon` を残す。`enterDungeon` は残したマップがあれば 1F の入口・北向きから使い、乱数を引かない
  - `src/api/game-view.ts`：場所が `INN` なら `dungeon` を `null`
  - `src/api/game-api.ts`：`debugDungeon` は場所が `INN` なら 409「ダンジョンに いません」
- アイコン（TD-0005 v1.14 §2.1）：
  - `scripts/make-icons.mjs` を、`necromancer.png` を読んで切り抜く作りに書き替える。`decodePng`・`renderIcons` を書き出し、直接動かしたときだけ書く。テストから読むための型 `scripts/make-icons.d.mts` を足す（`scripts/docs-only.d.mts` と同じやり方）
  - `npm run icons` で `public/icons/` の 5 つを作り直してコミットする
- 新しい確認 ID：TC-0002-08（`tests/scripts/icons.test.ts`）、TC-0017-05（`tests/domain/explore.test.ts`）、TC-0017-06（`tests/api/game-api.test.ts`）
- 落ちるテストを直す（下の表）
- 古い値でも探す：`509`・`510`（入力止め。遭遇の音の長さの 510 は変えない）、「違う迷宮」・`dungeon` が null になることを確かめているところ（帰還のあと）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.22 に合わせ、第 2 部の該当するところ（explore・game-view・debugDungeon・make-icons）を実装に合わせる
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` を入れない）。一括の置き換えは、置き換える文字があるファイルだけにかける

## 対象の確認 ID

テストケースの中身が変わったもの（v1.22 で直した）：

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/audio/sound.test.ts`・`tests/logic/message-plan.test.ts` | TC-0018-10 |
| `e2e/battle.spec.ts` | TC-0018-11・TC-0018-13 |
| `tests/domain/explore.test.ts` | TC-0013-01（名前だけ）・TC-0017-01・TC-0017-05（新しい） |
| `tests/api/game-api.test.ts` | TC-0013-03・TC-0017-06（新しい） |
| `e2e/dungeon.spec.ts` | TC-0017-04 |
| `tests/scripts/icons.test.ts` | TC-0002-08（新しい） |

- 04 の時点（2026-11-13）で仮に当てると、単体 4 件（TC-0013-03・TC-0017-01・TC-0018-10 の 2 件）、E2E 3 個のテスト（TC-0018-11・TC-0018-13・TC-0017-04。3 つの画面幅で 9 件）が落ちた。表はその全部と、新しい確認 ID。
- E2E のシード（`SEEDS`）は、帰還のあとの出発で乱数を引かなくなっても、どれも変わらなかった（落ちたのは上の 3 個だけ）。
- 遊ぶ長さ：模擬プレイ（自動プレイヤーで 1F からクリアまで、シード 1〜10）は、v1.21 の作りで戦闘 446 回・クリア Lv39.8、仮に当てた作りで戦闘 469 回・クリア Lv40 だった。自動プレイヤーは `debugDungeon` で迷宮の全体を見て道を選ぶので、マップが残る得（探し直さなくてよい）は測れない（違いはシードによるばらつきの範囲。1 シードの戦闘は 386〜512 回）。人が遊ぶときの短くなり方は、WS の終わりの実機の確認で見る。AC-0043 に書く。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（アイコンの 5 つのファイル、戦闘の入力止め）
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0043（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
