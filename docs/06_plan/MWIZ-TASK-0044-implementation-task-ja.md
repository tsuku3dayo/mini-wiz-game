---
id: MWIZ-TASK-0044
type: Implementation Task
title: 敵の絵の v6 への差し替えと、アイコンの作り直し（仕様書 v1.23・v1.24）
status: stable
version: 1.0
updated: 2026-11-17
sources:
  - MWIZ-WS-0026（v1.0）
  - MWIZ-TC-0002（v1.3）
  - MWIZ-TC-0033（v1.6）
  - MWIZ-TD-0005（v1.15）
verified: null
---

# TASK-0044 敵の絵の v6 への差し替えと、アイコンの作り直し

- WS：[WS-0026](MWIZ-WS-0026-workstream-ja.md)
- ブランチ：`feat/TASK-0044-enemy-images-v6`
- 実施記録：AC-0044（PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0043

## やること

- `docs/requests/monster/strip-metadata-v6.mjs`（v1.23 の依頼のときに置いた）で、`docs/requests/monster/monster_*_pixel256_black_v6.png` の 6 枚から `public/enemies/<種類>.png` を作って上書きする。MD5 が仕様書 §13.1 の表と同じことを確かめる（`orc_lord` → `orc`、`dark_knight` → `darkKnight`）
- `scripts/make-icons.mjs`：`CROP_X = 44`・`CROP_SIZE = 199`（`CROP_Y = −16` は同じ）、頭の説明を v1.24 に（TD-0005 §2.1）。`npm run icons` で `public/icons/` の 5 つを作り直す
- `src/ui/theme.css`・`src/ui/style.css`：説明の文（コメント）の「敵の絵 v5」を版によらない書き方か v6 に直す。色・形は変えない
- 表示の大きさ・並び・文は変えない（256×256 のまま）
- テスト：下の表。`tests/assets/enemy-images.test.ts` の MD5 と説明、`tests/scripts/icons.test.ts` のテストの名前と説明（(26, −16)・一辺 198 → (44, −16)・一辺 199。値は `CROP_X` などから取るので式は変わらない）。直す前に、`e2e/`・`tests/`・`src/`・`scripts/` で v5 の MD5（`a3baa3f4…` など）・「v5」・`26, −16`・`198` を探し、直すところがほかにないことを確かめる（古い値そのものでも grep する。ふりかえり ws-20）。**ファイル名（`necromancer.png` など）でも探し、絵から作るものがほかにないことを確かめる**（v1.23 でアイコンを見落とした）
- スクリーンショット：375 × 667 と 1280 × 800 で、戦闘画面（6 体）を見る（絵のまわりに四角が見えないか）。アイコン 5 つも開いて見る
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.23・v1.24 に合わせる（§30.5 は第 2 部なので、そこも）
- 依頼書 v1.23・v1.24 の影響の一覧の「結果」を埋める
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/screenshot/` と、使わない 128 版の v6 の 5 枚を入れない）

## 対象の確認 ID（4 個：直す 4。うち手動 2）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/assets/enemy-images.test.ts` | TC-0033-05（直す：MD5） |
| `tests/scripts/icons.test.ts` | TC-0002-08（直す：切り抜き） |
| 実機（手動） | TC-0033-06（直す：v6 の絵） |
| 実機（手動） | TC-0002-09（直す：v6 のアイコン） |

- TC-0033-01〜04・07（`e2e/battle.spec.ts`。07 は 4 隅が `(0,0,0,255)`。v6 も 4 隅は純黒で不透明）・TC-0003-02・TC-0001-03（`e2e/pwa.spec.ts`）・TC-0002-06（manifest のアイコン）・`scripts/check-dist.mjs` は、大きさ・ファイル名が同じなので、直さずに通ることを確かめる。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0044（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
