---
id: MWIZ-AC-0027
type: Attested Computation
title: 敵の絵の 256×256 の v2 への差し替えの実施記録
status: stable
version: 1.0
updated: 2026-11-06
sources:
  - MWIZ-TASK-0027（v1.0）
  - MWIZ-TC-0033（v1.3）
  - MWIZ-TD-0003（v1.4）
  - MWIZ-TD-0005（v1.10）
verified: { by: "tsuku3dayo", at: "2026-11-06T15:25:22+09:00" }
---

# AC-0027 敵の絵の 256×256 の v2 への差し替えの実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0027](../06_plan/MWIZ-TASK-0027-implementation-task-ja.md) 敵の絵の 256×256 の v2 への差し替え（変更の依頼 `docs/requests/2026-11-06-spec-1.5-enemy-images-256.md`） |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0027-enemy-images-256` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Vitest 5.0.5、Playwright 1.64.1 の Chromium |

作ったもの：

- 敵の絵 6 枚を、名前を付け替えて上書きで置いた（中身は同じ。MD5 が仕様書 §13.1 と同じことを確かめた）

| 置き場所 | 元のファイル（`docs/requests/monster/`） | バイト数 | MD5 |
| --- | --- | --- | --- |
| `public/enemies/slime.png` | `monster_slime_pixel256-v2.png` | 23,347 | `c5fed93d07e3f2c1bdb5b14da661d597` |
| `public/enemies/goblin.png` | `monster_goblin_pixel256-v2.png` | 30,775 | `480285da5605c87912288a3dac40d796` |
| `public/enemies/skeleton.png` | `monster_skeleton_pixel256-v2.png` | 49,242 | `2d04fbc3b88264e7acacc251ef35af04` |
| `public/enemies/orc.png` | `monster_orc_lord_pixel256-v2.png` | 56,298 | `9b9153c28e912c0c16db6b1d9cded4f1` |
| `public/enemies/darkKnight.png` | `monster_dark_knight_pixel256-v2.png` | 51,707 | `26fe01578e1da2a8ba6e0e581ca4a8a4` |
| `public/enemies/necromancer.png` | `monster_necromancer_pixel256-v2.png` | 58,473 | `6fa856ff00c6e18be8a45aa8a96f58b4` |

- 表示の作りは変えていない（枠 256px・`image-rendering: pixelated`）。説明の文を「128×128 を 2 倍」→「256×256 をそのまま」に直した：`src/logic/enemy-image.ts`・`src/ui/components/enemy-image.ts`・`src/ui/screens/battle.ts`・`src/ui/style.css`
- `scripts/check-dist.mjs`：敵の絵の幅・高さを 256 に
- テスト：`tests/assets/enemy-images.test.ts`（256×256・MD5）、`e2e/battle.spec.ts`（`naturalWidth`・`naturalHeight` 256、テストの名前）、`e2e/pwa.spec.ts`（敵の絵の読み込みの確かめを `naturalWidth` 256 に）
  - 直す前に、`e2e/`・`tests/`・`src/`・`scripts/` で `128` を探し、直すところを全部挙げてから直した（ほかの `128` は、戦闘の回数・メッセージ欄の高さ・地図の位置で、関係なかった）。TASK-0026 で `e2e/pwa.spec.ts` を見落としたため
- `docs/reproduction-specification.md`：第 1 部を仕様書 v1.5 に置き換えた（頭の版の行と、改訂履歴の「再現」の 4 行のほかは仕様書と同じことを、`git diff --no-index` で確かめた）。第 2 部の §20.1・§29.2・§29.4・§32・付録 A.5 の敵の絵の大きさを直した
- AC-0026：タイトル画像の実機の結果（TC-0006-13 OK）と PR #79 の CI の結果を書き、TC-0033-06 はこの記録で行うと書いた

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0033-01 | E2E（`e2e/battle.spec.ts`） | OK。6 体とも `enemies/<種類>.png` が読み込まれ、`naturalWidth`・`naturalHeight` が 256。絵の下端と名前の上端の差 0.5px 以内 |
| TC-0033-02 | E2E（同上） | OK。`pixel7`・`small`・`desktop`・414 × 715・1366 × 657 で、枠と `img` が 256 × 256。`image-rendering` が `pixelated` |
| TC-0033-05 | 単体（`tests/assets/enemy-images.test.ts`） | OK。6 枚とも PNG・256 × 256・8 ビット RGBA、MD5 が仕様書 §13.1 と同じ。余分なファイルなし |
| TC-0003-01 | E2E（`e2e/pwa.spec.ts`） | OK。通信を切って読み込み直しても、戦闘の敵の絵（`naturalWidth` 256）まで出る。同じ確かめを使う TC-0001-03 も通った |
| TC-0033-06 | 手動（iPhone 11・PC。2026-11-06、オーナー） | OK（下の「WS-0012 の手動テスト（v2 の敵の絵）」） |

あわせて確かめたこと：

- 撮影用の一時のテストで、6 体の戦闘画面を 375 × 667 と 1280 × 800 で撮り、はみ出しを測った。1280 × 800 で縦・横とも 0、375 × 667 で縦 47px（GUI-0005 §1.1 に書いてある前からの値と同じ）・横 0。絵はどれも 256 × 256・`pixelated`。
- スクリーンショットで、敵の絵と名前が重ならないこと、細かいところまで描かれていることを見た。

手元で通したもの（2026-11-06）：

- `npm run verify`：lint エラー 0、check:docs エラー 0・注意 0（確認 ID 329、テストのコードに 310 のまま）、単体 180 件、build、check:dist OK
- `npm run test:e2e`：460 件通った・44 件はその端末の対象外で飛ばした（1 回目で通った）

CI の結果（PR #83、2026-11-06）：`check`（verify）OK 1 分 2 秒、`e2e` OK 5 分 19 秒。マージのあと、main の test（5 分 31 秒）・pages（1 分 13 秒）も成功し、公開 URL の敵の絵 6 枚の MD5 が仕様書 v1.5 と同じことを確かめた。

### WS-0012 の手動テスト（v2 の敵の絵）（2026-11-06、オーナー）

PR #83 のマージの前に、確かめること・見るところ・返事のひな形をオーナーに渡した（6 体すべてを探さなくてよいと伝えた）。

| 確認 ID | 確かめたこと | 結果 |
| --- | --- | --- |
| TC-0033-06 | iPhone 11 と PC で、公開 URL の戦闘画面の敵の絵（256×256 の v2）がぼやけず、細かいところまで見え、名前と重ならない | OK（オーナーの返事「確認しました」。iPhone・PC で見て OK だったことを、次の依頼の確認で確かめた） |

- 見た敵の名前は、返事になかった。
- 同じ返事で、オーナーから敵の絵を v3（`monster_*_pixel256-v3.png`）に替える依頼を受けた（変更の依頼 v1.6。`docs/requests/2026-11-06-spec-1.6-enemy-images-v3.md`）。v3 の絵では、TC-0033-06 を AC-0028 でもう一度行う。

## 3. 確認できなかったこと

- 実機で見た敵の種類は分からない（返事に名前がなかった）。6 枚がそろい、大きさと描き方が同じことは、自動テスト（TC-0033-01・02・05）で確かめた。
- Android の実機はない（E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。撮影用の一時ファイルは作業用の一時フォルダに置いた。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た
- [x] 設計と違う作りにしたら、TD・GUI を直した（設計どおり）
- [x] AC-0027（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #83）
- [x] マージされた（マージ = 公開。PR #83、2026-11-06）
- [x] WS の終わりの手動テスト（TC-0033-06）の結果を書いた
