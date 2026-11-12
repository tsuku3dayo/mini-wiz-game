---
id: MWIZ-TASK-0040
type: Implementation Task
title: 敵の絵の v5 への差し替えと、敵のウィンドウの背景（真っ黒）
status: stable
version: 1.0
updated: 2026-11-12
sources:
  - MWIZ-WS-0022（v1.0）
  - MWIZ-TC-0033（v1.5）
  - MWIZ-TD-0004（v1.9）
verified: null
---

# TASK-0040 敵の絵の v5 への差し替えと、敵のウィンドウの背景（真っ黒）

- WS：[WS-0022](MWIZ-WS-0022-workstream-ja.md)
- ブランチ：`feat/TASK-0040-enemy-images-v5`
- 実施記録：AC-0040（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0039

## やること

- `docs/requests/monster/strip-metadata-v5.mjs`（v1.19 の依頼のときに置いた）で、`docs/requests/monster/monster_*_pixel256_black_v5.png` の 6 枚から `public/enemies/<種類>.png` を作って上書きする。MD5 が仕様書 §13.1 の表と同じことを確かめる（`orc_lord` → `orc`、`dark_knight` → `darkKnight`）
- `src/ui/theme.css`：`--wiz-color-enemy-background: #000000` を足す。`src/ui/style.css`：`.battle-enemy-window { background: var(--wiz-color-enemy-background); }`（TD-0004 §5）
- 表示の大きさ・並び・文は変えない（256×256 のまま）
- テスト：下の表。`tests/assets/enemy-images.test.ts` の MD5・カラータイプ（2 か 6）・チャンク。直す前に、`e2e/`・`tests/`・`src/`・`scripts/` で v4 の MD5（`58a788c9…` など）と「カラータイプ 6」「背景透過」を探し、直すところがほかにないことを確かめる（古い値そのものでも grep する。ふりかえり ws-20）
- スクリーンショット：375 × 667 と 1280 × 800 で、戦闘画面（6 体・体力わずかの赤い枠）を見る（絵のまわりに四角が見えないか）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.19 に合わせる
- 依頼書の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` を入れない）

## 対象の確認 ID（3 個：新しい 1・直す 2。うち手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/assets/enemy-images.test.ts` | TC-0033-05（直す） |
| `e2e/battle.spec.ts` | TC-0033-07（新） |
| 実機（手動） | TC-0033-06（直す） |

- TC-0033-01〜04（`e2e/battle.spec.ts`）・TC-0003-02・TC-0001-03（`e2e/pwa.spec.ts`）・TC-0019-13（体力わずかの線の色）・TC-0036-10（読み上げの検査）・`scripts/check-dist.mjs` は、大きさ・ファイル名が同じなので、直さずに通ることを確かめる。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0040（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
