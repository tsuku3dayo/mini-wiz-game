---
id: MWIZ-AC-0026
type: Attested Computation
title: タイトル画像と敵の絵の v2 への差し替えの実施記録
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-TASK-0026（v1.0）
  - MWIZ-TC-0006（v1.5）
  - MWIZ-TC-0033（v1.4）
  - MWIZ-TD-0003（v1.6）
  - MWIZ-TD-0005（v1.13）
verified: { by: "tsuku3dayo", at: "2026-11-06T15:25:22+09:00" }
---

# AC-0026 タイトル画像と敵の絵の v2 への差し替えの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0026](../06_plan/MWIZ-TASK-0026-implementation-task-ja.md) タイトル画像と敵の絵の v2 への差し替え（変更の依頼 `docs/requests/2026-11-06-spec-1.4-images-v2.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0026-images-v2` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.0.5、Playwright 1.64.1 の Chromium |

作ったもの：

- 画像 7 枚を、名前を付け替えて上書きで置いた（中身は同じ。MD5 が仕様書 §13.1・§13.6 と同じことを確かめた）

| 置き場所 | 元のファイル（`docs/requests/`） | バイト数 | MD5 |
| --- | --- | --- | --- |
| `public/title/title.png` | `title/wiz_mini_title_v2.png` | 105,151 | `36dd93edda255751560af6e4bcfb1aab` |
| `public/enemies/slime.png` | `monster/monster_slime_pixel128-v2.png` | 7,156 | `54fd821a1a65086167e7f944908ca45b` |
| `public/enemies/goblin.png` | `monster/monster_goblin_pixel128-v2.png` | 8,248 | `5786c7f1224d409b42f33e59e59ca1fb` |
| `public/enemies/skeleton.png` | `monster/monster_skeleton_pixel128-v2.png` | 11,886 | `5138ec2dd0fcf6aa1197729bc3ed50a0` |
| `public/enemies/orc.png` | `monster/monster_orc_lord_pixel128-v2.png` | 14,074 | `26c758185fbac746728186b11635b4e2` |
| `public/enemies/darkKnight.png` | `monster/monster_dark_knight_pixel128-v2.png` | 11,490 | `a390b6283bc0014c4cb9b5dbaad5bbd0` |
| `public/enemies/necromancer.png` | `monster/monster_necromancer_pixel128-v2.png` | 13,687 | `7d48073ecad4ec8cfe622cf759945193` |

- 表示の作りは変えていない（枠 256px・`image-rendering: pixelated`）。説明の文だけ直した：`src/logic/enemy-image.ts`（`ENEMY_IMAGE_PX` の説明「どの画面も拡大しない」→「絵をぼかさずに 2 倍で出す」）、`src/ui/components/enemy-image.ts`・`src/ui/screens/battle.ts`・`src/ui/style.css`
- `scripts/check-dist.mjs`：敵の絵の幅・高さを 128 に
- テスト：`tests/assets/enemy-images.test.ts`（128×128・MD5）、`tests/assets/title-image.test.ts`（MD5）、`e2e/battle.spec.ts`（読み込みの確かめを `naturalWidth`・`naturalHeight` 128 に、テストの名前）、`e2e/pwa.spec.ts`（TC-0001-03・TC-0003-01 の敵の絵の読み込みの確かめを `naturalWidth` 128 に）
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.4 に置き換えた（頭の版の行と、改訂履歴の「再現」の 3 行のほかは仕様書と同じことを、`git diff --no-index` で確かめた）。第 2 部の §20.1・§29.2・§29.4・§32・付録 A.5 の敵の絵の大きさを直した

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0033-01 | E2E（`e2e/battle.spec.ts`） | OK。6 体とも `enemies/<種類>.png` が読み込まれ、`naturalWidth`・`naturalHeight` が 128。絵の下端と名前の上端の差 0.5px 以内 |
| TC-0033-02 | E2E（同上） | OK。`pixel7`・`small`・`desktop`・414 × 715・1366 × 657 で、枠と `img` が 256 × 256。`image-rendering` が `pixelated` |
| TC-0033-05 | 単体（`tests/assets/enemy-images.test.ts`） | OK。6 枚とも PNG・128 × 128・8 ビット RGBA、MD5 が仕様書 §13.1 と同じ。余分なファイルなし |
| TC-0006-12 | 単体（`tests/assets/title-image.test.ts`） | OK。PNG・1080 × 720・8 ビット RGB、MD5 が仕様書 §13.6 と同じ |
| TC-0006-09 | E2E（`e2e/title.spec.ts`） | OK（そのまま通った）。`naturalWidth` 1080 |
| TC-0006-10 | E2E（同上） | OK（そのまま通った）。画面の大きさごとの画像の大きさと左右の余白 |
| TC-0006-13 | 手動（iPhone 11・PC のブラウザ。2026-11-06、オーナー） | OK（下の「WS-0012 の手動テスト（タイトル画像）」） |
| TC-0033-06 | 手動（iPhone 11・PC） | この記録では行わない。128×128 の敵の絵は、実機で見る前に v1.5 で 256×256 の v2 の絵に替えることになったので、AC-0027 で 256×256 の絵について行う |

あわせて確かめたこと：

- 撮影用の一時のテストで、タイトル画面と 6 体の戦闘画面を 375 × 667 と 1280 × 800 で撮り、はみ出しを測った。タイトルは縦・横とも 0。戦闘は 1280 × 800 で 0、375 × 667 で縦 47px（GUI-0005 §1.1 に書いてある前からの値と同じ）、横 0。敵の絵はどれも 256 × 256・`pixelated` で、点がくっきりしていた。
- スクリーンショットで、画像・メニュー・版の表記、敵の絵と名前が重ならないことを見た。スライムは、絵の中で描かれている部分が小さい（128 × 128 の中の下の方）ので、ほかの敵より小さく見える。

手元で通したもの（2026-11-06）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 0（確認 ID 329、テストのコードに 310 のまま。手動の TC-0033-06 は、この AC の表に ID があるので数えられているが、結果はまだない。WS の終わりに書く）、単体 180 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした

CI の結果（PR #79、2026-11-06）：`check`（verify）OK 40 秒、`e2e` OK 4 分 54 秒。マージのあと、main の test（5 分 24 秒）・pages（1 分 28 秒）も成功し、公開 URL の `title/title.png`（`36dd93edda255751560af6e4bcfb1aab`）と `enemies/slime.png`（`54fd821a1a65086167e7f944908ca45b`）の MD5 が仕様書 v1.4 と同じことを確かめた。

### WS-0012 の手動テスト（タイトル画像）（2026-11-06、オーナー）

PR #79 のマージの前に、確かめること・見るところ・返事のひな形をオーナーに渡した。セーブのある状態のタイトル画面は、画像を替えただけでタイトル画面の作りを変えていないので、頼まなかった（案内に理由を書いた）。

| 確認 ID | 確かめたこと | 結果 |
| --- | --- | --- |
| TC-0006-13 | iPhone 11 の Safari と PC のブラウザで公開 URL のタイトル画面を開く。新しいタイトル画像がぼやけず、文字が読め、メニュー・版の表記と重ならず、スクロールせずに全部見える | OK（PC・iPhone。オーナーの返事「タイトル画面はOKです（PC,iPhone）」） |

- 同じ返事で、オーナーから敵の絵を `monster_*_pixel256-v2.png` に替える依頼を受けた（変更の依頼 v1.5。`docs/requests/2026-11-06-spec-1.5-enemy-images-256.md`）。
  - 1 回目は 6 件落ちた：`e2e/pwa.spec.ts` の TC-0001-03・TC-0003-01（3 端末ずつ）が、敵の絵の読み込みを `naturalWidth` 256 で待っていた。TASK に挙げていなかったテストで、`naturalWidth` と 256 を `e2e/`・`tests/`・`src/` で探し直して、ほかにないことを確かめてから 128 に直した

## 3. 確認できなかったこと

- 128×128 の敵の絵の実機での見え方（TC-0033-06）は確かめていない。v1.5 で 256×256 の v2 の絵に替えることになったため（公開していたのは 2026-11-06 の PR #79 のマージから v1.5 の公開まで）。TC-0033-06 は AC-0027 で 256×256 の絵について行う。
- タイトル画面の実機の確認では、セーブのある状態は見ていない（上のとおり、頼まなかった）。
- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。撮影用の一時ファイルは作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおり）
- [x] AC-0026（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #79）
- [x] マージされた（マージ = 公開。PR #79、2026-11-06）
- [x] WS の終わりの手動テスト（TC-0006-13）の結果を書いた（TC-0033-06 は AC-0027 で行う）
