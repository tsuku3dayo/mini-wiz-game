---
id: MWIZ-AC-0028
type: Attested Computation
title: 敵の絵の v3 への差し替えの実施記録
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-TASK-0028（v1.0）
  - MWIZ-TC-0033（v1.3）
verified: { by: "tsuku3dayo", at: "2026-11-06T15:25:22+09:00" }
---

# AC-0028 敵の絵の v3 への差し替えの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0028](../06_plan/MWIZ-TASK-0028-implementation-task-ja.md) 敵の絵の v3 への差し替え（変更の依頼 `docs/requests/2026-11-06-spec-1.6-enemy-images-v3.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0028-enemy-images-v3` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.0.5、Playwright 1.64.1 の Chromium |

作ったもの：

- 敵の絵 6 枚を、名前を付け替えて上書きで置いた（中身は同じ。MD5 が仕様書 §13.1 と同じことを確かめた）

| 置き場所 | 元のファイル（`docs/requests/monster/`） | バイト数 | MD5 |
| --- | --- | --- | --- |
| `public/enemies/slime.png` | `monster_slime_pixel256-v3.png` | 24,384 | `d93b44dfa7d63c1da1e3e4b12c4b6a74` |
| `public/enemies/goblin.png` | `monster_goblin_pixel256-v3.png` | 31,098 | `16a4dc7c54cedf92e762f3f7e9136b8f` |
| `public/enemies/skeleton.png` | `monster_skeleton_pixel256-v3.png` | 50,343 | `9df2f42322c0b8fe44a1d911d73a643a` |
| `public/enemies/orc.png` | `monster_orc_lord_pixel256-v3.png` | 57,402 | `4f769408998fe5060cb04f2c97986716` |
| `public/enemies/darkKnight.png` | `monster_dark_knight_pixel256-v3.png` | 108,925 | `45c25616dad075cd9d9fef3888d42e90` |
| `public/enemies/necromancer.png` | `monster_necromancer_pixel256-v3.png` | 60,331 | `bb0343f58c663e01b63221ecb291795e` |

- 表示の作り・大きさ・説明の文は変えていない（256×256 のまま）。
- テスト：`tests/assets/enemy-images.test.ts` の MD5。直す前に `e2e/`・`tests/`・`src/`・`scripts/` で v2 の MD5 を探し、この 1 つのファイル（6 行）だけだと確かめた。
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.6 に置き換えた（頭の版の行と、改訂履歴の「再現」の 5 行のほかは仕様書と同じことを、`git diff --no-index` で確かめた）。第 2 部の §32・付録 A.5 の 9 を仕様書に合わせた。
- AC-0027：TC-0033-06 の結果（v2 の 256×256 の絵を実機で見て OK）と PR #83 の CI の結果を書いた。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0033-05 | 単体（`tests/assets/enemy-images.test.ts`） | OK。6 枚とも PNG・256 × 256・8 ビット RGBA、MD5 が仕様書 §13.1 と同じ。余分なファイルなし |
| TC-0033-06 | 手動（iPhone 11・PC。2026-11-06、オーナー） | OK（下の「WS-0012 の終わりの手動テスト（v3 の敵の絵）」） |

あわせて確かめたこと：

- 直さなかった敵の絵の E2E（TC-0033-01〜04 の `e2e/battle.spec.ts`、TC-0003-01・TC-0001-03 の `e2e/pwa.spec.ts`）は、大きさが同じなので、そのまま通った。
- 撮影用の一時のテストで、6 体の戦闘画面を 375 × 667 と 1280 × 800 で撮り、はみ出しを測った。1280 × 800 で縦・横とも 0、375 × 667 で縦 47px（GUI-0005 §1.1 に書いてある前からの値と同じ）・横 0。絵はどれも 256 × 256・`pixelated`。
- スクリーンショットで、半透明の点のある縁が、暗い背景で白っぽく浮いたり欠けたりして見えないこと、絵と名前が重ならないことを見た。

手元で通したもの（2026-11-06）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 0（確認 ID 329、テストのコードに 310 のまま）、単体 180 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした（1 回目で通った）

CI の結果（PR #87、2026-11-06）：`check`（verify）OK 1 分 1 秒、`e2e` OK 4 分 18 秒。マージのあと、main の test（4 分 44 秒）・pages（1 分 32 秒）も成功し、公開 URL の敵の絵 6 枚の MD5 が仕様書 v1.6 と同じことを確かめた。

### WS-0012 の終わりの手動テスト（v3 の敵の絵）（2026-11-06、オーナー）

PR #87 のマージの前に、確かめること・見るところ（半透明の点のある縁が欠けたり白っぽく浮いたりしていないかを含む）・返事のひな形（見た敵の名前の欄つき）をオーナーに渡した。

| 確認 ID | 端末 | 確かめたこと | 結果 |
| --- | --- | --- | --- |
| TC-0033-06 | iPhone 11 | 公開 URL の戦闘画面で、v3 の敵の絵がぼやけず、細かいところまで見え、輪郭が欠けたり浮いたりせず、名前と重ならない | OK（見た敵：6 体すべて） |
| TC-0033-06 | PC | 同上 | OK（見た敵：6 体すべて） |

## 3. 確認できなかったこと

- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。撮影用の一時ファイルは作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおり）
- [x] AC-0028（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #87）
- [x] マージされた（マージ = 公開。PR #87、2026-11-06）
- [x] WS の終わりの手動テスト（TC-0033-06）の結果を書いた
