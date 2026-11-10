---
id: MWIZ-TASK-0028
type: Implementation Task
title: 敵の絵の v3 への差し替え
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-WS-0012（v1.2）
  - MWIZ-TC-0033（v1.4）
verified: null
---

# TASK-0028 敵の絵の v3 への差し替え

- WS：[WS-0012](MWIZ-WS-0012-workstream-ja.md)
- ブランチ：`feat/TASK-0028-enemy-images-v3`
- 実施記録：AC-0028（`docs/07_attested/` に置く。PR に draft で入れ、WS の終わりに手動の結果を足して review）
- 前の TASK：TASK-0027（同じ WS。v1.5 の差し替え）

## やること

- `docs/requests/monster/monster_*_pixel256-v3.png` の 6 枚を `public/enemies/<種類>.png` に、名前を付け替えて上書きで置く（中身は変えない。MD5 で確かめる。`orc_lord` → `orc`、`dark_knight` → `darkKnight`）
- 表示の作り・大きさ・説明の文は変えない（256×256 のまま）
- テスト：`tests/assets/enemy-images.test.ts` の MD5。直す前に、`e2e/`・`tests/`・`src/`・`scripts/` で v2 の MD5 を探し、直すところがほかにないことを確かめる
- スクリーンショット：375 × 667 と 1280 × 800 で、6 体の戦闘画面を見る（半透明の点のある縁が、暗い背景で浮いたり欠けたりして見えないか）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.6 に合わせる
- AC-0027：TC-0033-06 の結果（v2 の 256×256 の絵を実機で見て OK。2026-11-06、オーナー）と、v3 の絵では AC-0028 でもう一度行うことを書く
- コミットの前に `git status` で入るファイルを見る（オーナーの `docs/SDD-PROCESS_v4.md` などを入れない）

## 対象の確認 ID（2 個：自動 1・手動 1）

| 置き場所 | 確認 ID |
| --- | --- |
| `tests/assets/enemy-images.test.ts` | TC-0033-05 |
| 実機（手動） | TC-0033-06 |

- TC-0033-01〜04（`e2e/battle.spec.ts`）と TC-0003-01・TC-0001-03（`e2e/pwa.spec.ts`）は、大きさが同じなので、直さずに通ることを確かめる。新しい確認 ID はない（確認 ID は 329、テストのコードに 310 のまま）。

## 完了の定義

- [ ] 上の自動の確認 ID のテストがすべてあり、通る
- [ ] `npm run verify` と `npm run test:e2e` が手元で通る
- [ ] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [ ] 設計と違う作りにしたら、TD・GUI を直した（承認済みの GUI は再承認）
- [ ] AC-0028（draft）に自動テストの結果を書き、同じ PR に入れた
- [ ] PR の CI が緑で、マージされた（マージ = 公開）
