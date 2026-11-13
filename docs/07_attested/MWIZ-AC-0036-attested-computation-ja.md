---
id: MWIZ-AC-0036
type: Attested Computation
title: 宿屋のメニューの並び・狭い画面の戦闘のボタンの実施記録
status: stable
version: 1.0
updated: 2026-11-11
sources:
  - MWIZ-TASK-0036（v1.0）
  - MWIZ-TC-0008（v1.2）
  - MWIZ-TC-0010（v1.1）
  - MWIZ-TC-0019（v1.5）
  - MWIZ-TC-0035（v1.3）
verified: { by: "tsuku3dayo", at: "2026-11-11T17:34:34+09:00" }
---

# AC-0036 宿屋のメニューの並び・狭い画面の戦闘のボタンの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0036](../06_plan/MWIZ-TASK-0036-implementation-task-ja.md) 画面：宿屋のメニューの並び・狭い画面の戦闘のボタン（変更の依頼 `docs/requests/2026-11-11-spec-1.14-slots-levelup-evade.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0036-inn-order-battle-buttons` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `src/ui/screens/inn.ts`：宿屋の項目を やすむ／メニュー／ダンジョンへ／セーブ／タイトルへ戻る の順に。メニューを閉じたあとのカーソルは「メニュー」（1）、タイトルへ戻るの確認から戻ったあとは「タイトルへ戻る」（4）。「セーブ」はいまの動き（`api.save()`）のまま（TASK-0037 でスロットの一覧に替える）
- `src/ui/components/command-buttons.ts`（新しく）：狭い画面の戦闘のボタン。外の箱 `role="menu"`、ボタン `<button role="menuitem">`（押せないものは `aria-disabled`。`disabled` 属性は付けない）、ロービング tabindex、← ↑ で前・→ ↓ で次（端で止まる。`logic/menu-model.ts` の `clampCursor`・`initialCursor`）、Enter・Space で 1 回だけ決める。項目の数が同じなら、押す要素を作り直さずに書き替える
- `src/ui/screens/battle.ts`：狭い画面は `commandButtons`、広い画面は `commandMenu`（同じ項目・同じ `update`）。画面の幅が替わったら作り直す（いまの `onWideChange` のまま）
- `src/ui/style.css`：`.command-buttons`（`grid-template-columns: 2fr 1fr 1fr`、間 8px、高さ 56px、選んでいるボタンは枠と文字を secondary、押せないボタンは disabled 色）
- `e2e/helpers.ts`：`cursorLabel` が、縦のメニューの行とボタンの両方のカーソル（`[role="menuitem"].active`）を読むように
- テスト：下の表。ほかに、宿屋の並びにキーの回数で頼っていた `e2e/menu.spec.ts`（TC-0010-02・TC-0036-03）・`e2e/a11y.spec.ts`（TC-0036-01）を直した
- `docs/03_gui/MWIZ-GUI-0005-gui-design-ja.md`：狭い画面の戦闘の画面の高さを、測った値（638px）に書き足した（測った値を書くだけなので版は上げない。TASK-0036 のとおり）

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0008-01 | E2E（3 端末） | OK |
| TC-0010-02 | E2E（`desktop`。キー） | OK |
| TC-0010-03 | E2E（`pixel7`・`small`。タップ） | OK |
| TC-0019-01 | E2E（3 端末。狭い画面はボタン、`desktop` は縦のメニュー） | OK |
| TC-0019-14 | E2E（3 端末） | OK |
| TC-0019-15 | E2E（`pixel7`・`small`） | OK |
| TC-0035-13 | E2E（`pixel7`・`small`） | OK（下の測った値） |

測った値（TC-0035-13。2026-11-11）：

| 画面の大きさ | 戦闘の画面の高さ | 縦のはみ出し | ボタンの下端から画面の下まで |
| --- | --- | --- | --- |
| 414 × 715 | 638px | 0px | 95px |
| 375 × 667 | 638px | 0px（v1.1 は 47px） | 47px |

- 縦の 3 行（44 × 3 = 132px）が横 1 列（56px）になり、76px 低くなった（設計の見込みのとおり）。

テストケースを直したこと：

- **TC-0019 v1.2**：TC-0019-14 は「たたかう の幅 ＝ ヒール ＋ にげる ＋ 間 8px」としていたが、仕様書 §11.5 の CSS（`grid-template-columns: 2fr 1fr 1fr`）では、たたかう の幅は ヒール ＋ にげる と同じになる（間の分は入らない）。仕様書を正として、テストケースの文を直した。根拠に書いた版の表記だけを 7 つの文書で直した。

そのまま通ったもの（テストの名前・中身を変えずに、ボタンの形でも通ることを確かめた）：TC-0011-07（逐次表示の間の二重押し）・TC-0037-02（「たたかう」からの時間）・TC-0035-02〜04・12（はみ出し）。

あわせて確かめたこと：

- 画面：宿屋と戦闘（ふつう・MP 2 の ヒール・ボス戦の にげる）を、375 × 667・414 × 715・1280 × 800 で撮って見た（作業用の一時フォルダ）。狭い画面では左から たたかう・ヒール・にげる が 2：1：1 で並び、押せないボタンは灰色、選んでいる たたかう は淡い金の枠と文字。PC は縦の 3 行のまま。

手元で通したもの（2026-11-11）：

- `npm run lint`：エラー 0。`npm run check:docs`：エラー 0・注意 2（AC-0024 の仕様書の版の表記＝承認済みの記録なので変えない、テストのコードがまだない確認 ID 4 個＝TASK-0037 の分）。単体 189 件。build、check:dist OK
- `npm run test:e2e`：500 件通った・46 件はその端末の対象外で飛ばした（7.6 分）

手動の確認（WS-0019 の終わり。公開中の版 `index-Dyp40HUq.js`）：

| 項目 | 方法 | 結果 |
| --- | --- | --- |
| 宿屋の並び（やすむ／メニュー／ダンジョンへ／セーブ／タイトルへ戻る） | 手動（iPhone 11 の Safari・PC の Chrome。2026-11-11 オーナー） | iPhone：OK。PC：OK |
| 戦闘のボタン（横 1 列、親指で押しやすいか） | 手動（iPhone 11 の Safari。2026-11-11 オーナー） | OK。あわせて、コマンドの枠をなくしてボタンを大きく（88px）したいという依頼を受けた（仕様書 v1.16 で扱う） |

## 3. 確認できなかったこと

- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- 測るためのプログラム・写真は、プロジェクトの外の作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（GUI の作りは設計どおり。TC-0019 の文を仕様書に合わせた）
- [x] AC-0036（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑で、マージされた（PR #117。マージ = 公開）
- [x] WS の終わりに実機の確認を案内し、結果を書いて review にした（iPhone・PC とも OK。2026-11-11）
