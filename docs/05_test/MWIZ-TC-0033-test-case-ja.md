---
id: MWIZ-TC-0033
type: Test Case
title: 戦闘で敵の絵を見る
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0033（v1.1）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0005（v1.1）
  - docs/specification-ja.md (v1.2) §13、§16.5
verified: null
---

# TC-0033 戦闘で敵の絵を見る

- 対象：[US-0033](../02_requirements/MWIZ-US-0033-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0033-01 | 1 | 6 体（`slime`・`goblin`・`skeleton`・`orc`・`darkKnight`・`necromancer`）それぞれの戦闘で、`[data-testid="enemy-window"]` の中に `[data-testid="enemy-image-frame"]` があり、`img` の `src` が `enemies/<種類>.png`（相対パス）で読み込めている（`complete` かつ `naturalWidth` が 256）。絵の枠の下端が敵の名前の上端と同じ（間 0px）で、絵は名前の上にある | E2E | `e2e/battle.spec.ts` |
| TC-0033-02 | 2 | `pixel7`・`small`・`desktop` と、`setViewportSize` で 414×715・1366×657 にしたとき、どれでも枠と `img` の `getBoundingClientRect` が幅 256・高さ 256。`img` の `image-rendering` が `pixelated` | E2E | `e2e/battle.spec.ts` |
| TC-0033-03 | 3 | `img` の `alt` が敵の名前と同じ（例：`necromancer` のとき「暗黒のネクロマンサー」、`darkKnight` のとき「ダークナイト」） | E2E | `e2e/battle.spec.ts` |
| TC-0033-04 | 4 | `page.route('**/enemies/*.png', r => r.abort())` で絵を読めなくすると、`[data-testid="enemy-image-frame"]` がなくなり、敵の名前だけが出る。`pageerror` が出ず、ErrorPanel（「きろくを よみかき できません」）も出ない。そのあと「たたかう」で戦闘が続けられる | E2E | `e2e/battle.spec.ts` |
| TC-0033-05 | 5 | §13.5 の 4 つ：各種類（`ENEMIES` のキー）の `public/enemies/<種類>.png` がある／PNG の署名 `89 50 4E 47 0D 0A 1A 0A`、12〜15 バイトが `IHDR`、16・20 バイト目からの 32 ビット BE の幅・高さが 256・256（加えてビット深度 8・カラータイプ 6（RGBA））／MD5 が §13.1 の表と同じ（slime `5f9c66ddc977d96bb6f1cacde5fe3fdf`、goblin `6c4fbda366c766f4be1300913503f455`、skeleton `6755e98e650fdb9088f4dbe86bdfe032`、orc `cbbdb07380d25f350f5034c5a528cadc`、darkKnight `3d6b07f209c1e271c60e8ac979fbe922`、necromancer `1a7644d8b548af4adbd4b7d5b5c8c492`）／`public/enemies/` の PNG が種類の一覧とちょうど同じ（余分なファイルがない） | 単体 | `tests/assets/enemy-images.test.ts` |

## 2. 準備

- 単体：`src/domain/constants.ts` の `ENEMIES` のキーと、`public/enemies/` のファイルを `node:fs`・`node:crypto` で読む。
- E2E：`?debug=1` で開き、`__wiz.writeState` で、6 体それぞれの戦闘中の状態（`battle.enemyKind`・`enemyName`）から始める（`e2e/helpers.ts` の `startAt('BATTLE', …)`）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0033-01 | 6 体ぶん、戦闘の状態を書いて開き直す → 絵の `src`・`naturalWidth`、枠と名前の `getBoundingClientRect` を見る |
| TC-0033-02 | ゴブリンの戦闘で、プロジェクトの大きさのまま測る → `setViewportSize({ width: 414, height: 715 })` → 測る → `setViewportSize({ width: 1366, height: 657 })` → 測る |
| TC-0033-04 | `page.route` を付けてからスライムの戦闘を開く → 枠がない・名前「スライム」が見える → 「たたかう」を押して次の行が出る |

## 4. 手動の手順

なし。
