---
id: MWIZ-AC-0040
type: Attested Computation
title: 敵の絵 v5 と敵のウィンドウの背景の実施記録
status: review
version: 1.0
updated: 2026-11-12
sources:
  - MWIZ-TASK-0040（v1.0）
  - MWIZ-TC-0033（v1.5）
verified: null
---

# AC-0040 敵の絵 v5 と敵のウィンドウの背景の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0040](../06_plan/MWIZ-TASK-0040-implementation-task-ja.md) 敵の絵の v5 への差し替えと、敵のウィンドウの背景（真っ黒）（変更の依頼 `docs/requests/2026-11-12-spec-1.19-enemy-images-v5.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0040-enemy-images-v5` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `public/enemies/*.png`：`docs/requests/monster/strip-metadata-v5.mjs` で、v5 の元の絵 6 枚から付属の情報を取り除いて置いた。MD5 は 6 枚とも仕様書 §13.1 の表と同じ（依頼のときに一時フォルダで作ったものとも同じ）
- `src/ui/theme.css`：`--wiz-color-enemy-background: #000000`
- `src/ui/style.css`：`.wiz-window.battle-enemy-window { background: var(--wiz-color-enemy-background); }`
- テスト：TC-0033-05（`tests/assets/enemy-images.test.ts`。MD5・カラータイプ 2 か 6・インタレースなし・チャンクは IHDR・IDAT・IEND だけ）を直し、TC-0033-07（`e2e/battle.spec.ts`）を足した
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.19 に合わせた（差分を当て、当たらなかった版の行・改訂履歴・§32 は手で直した。第 1 部が仕様書と 1 行も違わないことを比べて確かめた）
- 依頼書 v1.19 の影響の一覧に結果を書いた

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0033-05 | 単体 | OK |
| TC-0033-07 | E2E（3 端末） | OK（敵のウィンドウの背景 `rgb(0, 0, 0)`、メッセージ欄・ステータス・`body` は `rgb(11, 10, 15)`、二重線は同じ。6 体とも絵の 4 隅が `(0,0,0,255)`） |

テストの名前・中身を変えずに通ることを確かめたもの：TC-0033-01〜04・TC-0003-02・TC-0001-03・TC-0019-13・TC-0036-10。`scripts/check-dist.mjs` も OK。

画面の確かめ（作業用の一時フォルダに撮って見た。6 体、375 × 667・1280 × 800、体力わずかの赤い枠のとき）：

- 絵のまわりに四角は見えない。敵の名前は読める。
- 画面の高さは変わらない（375 × 667・414 × 715 で 634px、1280 × 800・800 × 600・600 × 800 で 581px。はみ出し 0）。依頼の時に仮に当てて測った値と同じ。

手元で通したもの（2026-11-12）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 1（AC-0024 の仕様書の版の表記＝承認済みの記録なので変えない）、単体 193 件、build、check:dist OK
- `npm run test:e2e`：519 件通った・51 件はその端末の対象外で飛ばした（失敗 0）

手動の確認（WS-0022 の終わり。公開中の版（CSS `index-DYyty-UY.css`、敵の絵 6 枚の MD5 が仕様書 §13.1 と同じことを公開 URL で確かめた）。2026-11-12 オーナー、iPhone 11 の Safari・PC）：

| 確かめたこと | 方法 | 結果 |
| --- | --- | --- |
| 敵の絵（v5）がぼやけず、細かいところまで見える。絵のまわりに四角が見えない（TC-0033-06） | 手動（iPhone 11・PC） | iPhone：OK。PC：OK |
| 敵のウィンドウの中の黒と、ほかのウィンドウ・画面の背景の色の違いが気にならない | 手動（iPhone 11・PC） | iPhone：OK。PC：OK |

- 案内の項目は、WS-0022 の「WS の終わりの手動テスト」の文から写して作った。
- 返事のひな形で「見た敵の名前」も頼んだが、返事には書かれていなかった（どの敵を見たかは記録にない。6 枚がそろい、大きさと描き方が同じことは TC-0033-01・02・05・07 で確かめた）。

## 3. 確認できなかったこと

- 実機で見た敵が 6 体のうちどれかは、記録にない（上の手動の確認）。
- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- 画面の写真と、撮るためのスクリプトは、プロジェクトの外の作業用の一時フォルダに置いた（リポジトリには入れていない）。確かめ用に動かしたサーバーは止めた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおりに作れたので直していない）
- [x] AC-0040（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑で、マージされた（マージ = 公開。PR #132）
- [x] WS の終わりに実機の確認を案内し、結果を書いて review にした（iPhone 11・PC とも 2 項目 OK。2026-11-12）
