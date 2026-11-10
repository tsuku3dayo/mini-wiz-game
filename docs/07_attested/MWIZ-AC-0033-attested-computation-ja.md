---
id: MWIZ-AC-0033
type: Attested Computation
title: 敵の絵の v4 への差し替えの実施記録
status: review
version: 1.0
updated: 2026-11-10
sources:
  - MWIZ-TASK-0033（v1.0）
  - MWIZ-TC-0033（v1.4）
verified: null
---

# AC-0033 敵の絵の v4 への差し替えの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0033](../06_plan/MWIZ-TASK-0033-implementation-task-ja.md) 敵の絵の v4 への差し替え（変更の依頼 `docs/requests/2026-11-10-spec-1.11-enemy-images-v4.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0033-enemy-images-v4` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.1.0、Playwright 1.64.1 の Chromium |

作ったもの：

- `docs/requests/monster/make-transparent-v4.mjs`：仕様書 §13.3 の「外側の黒を透明にする加工」のプログラム（Node.js の標準モジュール `fs`・`path`・`zlib` だけ）
- `public/enemies/*.png`（6 枚）：上のプログラムで `docs/requests/monster/monster_*_pixel256_v4.png` から作って上書きした（`node docs/requests/monster/make-transparent-v4.mjs docs/requests/monster public/enemies`）

| 置き場所 | 元のファイル | 透明にした点 | バイト数 | MD5 |
| --- | --- | --- | --- | --- |
| `public/enemies/slime.png` | `monster_slime_pixel256_v4.png` | 57,696 | 24,173 | `58a788c9a1f09c8ce6d1848ffc13fcd2` |
| `public/enemies/goblin.png` | `monster_goblin_pixel256_v4.png` | 55,618 | 29,693 | `3ce1e98f8e51eedc2135936dcf8ee213` |
| `public/enemies/skeleton.png` | `monster_skeleton_pixel256_v4.png` | 49,671 | 46,119 | `4bc89ceedb1c173154607ec49fe97038` |
| `public/enemies/orc.png` | `monster_orc_lord_pixel256_v4.png` | 46,935 | 53,621 | `01dccc02fc2c907750fa470352afcad5` |
| `public/enemies/darkKnight.png` | `monster_dark_knight_pixel256_v4.png` | 47,702 | 50,101 | `fdf164a6d3c4593589c1ce9ad3e6d3ff` |
| `public/enemies/necromancer.png` | `monster_necromancer_pixel256_v4.png` | 45,368 | 55,949 | `7ed1ef69c6e58fd0bd23357f45335013` |

- `tests/assets/enemy-images.test.ts`：MD5 を上の値に。直す前に、`src`・`tests`・`e2e`・`scripts`・`public` で v3 の MD5 を探し、ほかにないことを確かめた
- `docs/reproduction-specification.md`：仕様書 v1.10 → v1.11 の差分を当てた（`git apply --ignore-whitespace`。当たらなかった 3 か所（頭の版の行・改訂履歴・§32 の素材）は手で直した）。§13.1〜§13.3 が仕様書と一字一句同じことを確かめた

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0033-05 | 単体（`tests/assets/enemy-images.test.ts`） | OK。6 種類の PNG があり、256×256・8 ビット・RGBA（カラータイプ 6）、MD5 が §13.1 の表と同じ、余分なファイルなし |
| TC-0033-06 | 手動（iPhone・PC） | OK（オーナー、2026-11-10。iPhone・PC の両方。絵がぼやけず細かいところまで見え、絵のまわりに黒い四角・縁の黒い線が見えず、内側の暗い所（スライムのしずくの間など）も問題なし） |

あわせて確かめたこと：

- 加工の結果を、別の方法（Windows の画像の機能 System.Drawing）で、6 枚とも点ごとに確かめた（一度だけ。テストには残していない）：透明の点は元の絵で真っ黒 `(0,0,0)`、不透明の点は元の絵と同じ色、半透明の点は 0。合わない点は 0。
- 加工のプログラムを 2 回動かして、MD5 が同じことを確かめた（変更の依頼のとき）。
- TC-0033-01〜04（`e2e/battle.spec.ts`）と TC-0003-01・TC-0001-03（`e2e/pwa.spec.ts`）は、大きさが同じなので直さずに通った。
- 画面：6 体の戦闘画面を、一番小さいスマートフォンの幅（375×667）と PC（1280×800）で撮った（作業用の一時フォルダ）。どれも絵のまわりに黒い四角は見えず、縁に黒い線も見えなかった。
- 外側とつながっていない真っ黒の点は、決まり（仕様書 §13.3）どおり透明にせず残る：スライム 564・ゴブリン 151・スケルトン 533・オーク 222・ダークナイト 152・ネクロマンサー 539 点（絵全体の 0.2〜0.9%）。影として描かれた所と、絵に囲まれた背景のすき間の両方がある。スライムのしずくの間などは、画面の背景（`#0b0a0f`）よりわずかに暗く見える。気になるかどうかを実機で見ていただく。

手元で通したもの（2026-11-10）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 1（AC-0024 の仕様書の版の表記。承認済みの記録なので変えない）、単体 184 件、build、check:dist OK
- `npm run test:e2e`：463 件通った・44 件はその端末の対象外で飛ばした（7.0 分）

## 3. 確認できなかったこと

- 実機の確認は、オーナーの返事「iPhone・PC ともに OK」だけを聞いた。返事のひな形の項目（見え方・黒い四角と縁・内側の暗い所）はすべて OK として書いた。どの敵を見たか、iPhone の機種までは聞いていない（6 枚がそろい、大きさと描き方が同じことは TC-0033-01・02・05 で確かめている）。
- Android の実機はない。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。確かめのためのプログラムと、差分を当てたときの記録（`.rej`）は、プロジェクトの外の作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおり。表示の作りは変えていない）
- [x] AC-0033（draft）に自動テストの結果を書き、同じ PR に入れた（PR #106）
- [x] PR の CI が緑（PR #106：changes 7s・check 1m15s・e2e 5m52s）
- [x] マージされた（マージ = 公開。2026-11-10、main の pages：build 1m5s・deploy 11s。公開ページの 6 枚の MD5 が §13.1 の表と同じことを確かめた）
- [x] 公開したらすぐ実機の確認を案内し、結果を書いて review にした（2026-11-10）
