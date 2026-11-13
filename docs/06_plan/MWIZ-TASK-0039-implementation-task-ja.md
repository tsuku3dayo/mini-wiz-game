---
id: MWIZ-TASK-0039
type: Implementation Task
title: PC の戦闘のボタン（横 1 列）と、遭遇の入力止め（510ms・2906ms）
status: stable
version: 1.0
updated: 2026-11-12
sources:
  - MWIZ-WS-0021（v1.0）
  - MWIZ-TC-0011（v1.4）
  - MWIZ-TC-0018（v1.5）
  - MWIZ-TC-0019（v1.5）
  - MWIZ-TC-0034（v1.6）
  - MWIZ-TC-0036（v1.3）
  - MWIZ-TD-0003（v1.8）
  - MWIZ-TD-0004（v1.9）
verified: null
---

# TASK-0039 PC の戦闘のボタン（横 1 列）と、遭遇の入力止め（510ms・2906ms）

- WS：[WS-0021](MWIZ-WS-0021-workstream-ja.md)
- ブランチ：`feat/TASK-0039-pc-battle-buttons-encounter-lock`
- 実施記録：AC-0039（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0038

## やること

- `src/logic/message-plan.ts`：`ENCOUNTER_LOCK_MS = { normal: 510, boss: EFFECT_MS.bossAppear }` と `encounterLockMs(isBoss)`（TD-0003 §3）
- `src/ui/message-queue.ts`：`locked`・`lock(ms)` を足す。`busy` に `locked` を含める。`skip()` は `locked` の間何もしない。`clear()`・`destroy()` で入力止めのタイマーを止める（TD-0003 §3）
- `src/ui/command.ts`：遭遇のとき `queue.clear()` のあとに `queue.lock(encounterLockMs(next.battle?.isBoss === true))`（TD-0003 §1）
- `src/ui/screens/battle.ts`：広い画面も `commandButtons` を `.battle-command-buttons` の箱に置き、`commandMenu`・`gameWindow({ title: 'コマンド' })` の分岐を消す（TD-0004 §5）
- `src/ui/style.css`：広い画面でボタンの箱を右の列の残りいっぱいに伸ばし、ボタンを `min-height: 88px` で箱の高さにする。`.battle-command` の規則を消す（TD-0004 §5）
- テスト：下の表。**遭遇した直後に操作している E2E**（前進で遭遇してすぐ「たたかう」、ボスの手前から前進してすぐメッセージ欄をクリックする、など）は 510ms・2906ms 待たないと進まなくなるので、探して直す（`encounter`・`bossAppear`・`あらわれた`・`SEEDS` の遭遇のシード・`bossBattle` でない「ボスの手前」の場面で grep する。偽の時計なら `runFor`、本物の時計なら `body[data-busy]` が `false` になるのを待つ）。`startAt('BATTLE')` で始める戦闘は遭遇の操作を通らないので止まらない。広い画面の「コマンド」の見出し・縦のメニュー（`▶`・`commandMenu`）に頼る E2E も直す（ふりかえり ws-19 の T：`battle-command`・`コマンド` で grep する）
- スクリーンショット：1280 × 800・800 × 600・600 × 800・375 × 667 で戦闘（ふつう・MP 2・ボス）。広い画面の高さ（581px）とボタンの高さ（130px・104px）を、GUI-0005 の仮の値と比べる
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.18 に合わせ、第 2 部を実装に合わせる
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` を入れない）

## 対象の確認 ID（9 個：新しい 6・直す 3）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/audio/sound.test.ts` | TC-0018-10（新） |
| `e2e/battle.spec.ts` | TC-0018-11・13（新）、TC-0019-17・18（新）、TC-0019-01・14（直す） |
| `e2e/effects.spec.ts` | TC-0018-12（新） |
| `e2e/sound.spec.ts` | TC-0034-13（直す） |

- TC-0011-05〜07（逐次表示のスキップ・無効）・TC-0019-15（狭い画面のボタンの操作）・TC-0031-08（演出のスキップ。levelUp で確かめている）・TC-0032-08・10・13（遭遇の音・ボス出現の音・スキップで止まる）・TC-0035-01・12（タップだけで遊べる・PC のはみ出し）・TC-0036-10（読み上げの検査。広い画面のボタンも入る）は、テストの名前を変えずに通ることを確かめる（遭遇の直後に押す手順があれば、待ちを足す）。

## 完了の定義

- [ ] 上の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0039（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
