---
id: MWIZ-TC-0033
type: Test Case
title: 戦闘で敵の絵を見る
status: stable
version: 1.2
updated: 2026-11-06
sources:
  - MWIZ-US-0033（v1.3）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0003（v1.4）
  - MWIZ-TD-0004（v1.2）
  - MWIZ-GUI-0005（v1.3）
  - docs/specification-ja.md (v1.5) §13、§16.5
verified: null
---

# TC-0033 戦闘で敵の絵を見る

- 対象：[US-0033](../02_requirements/MWIZ-US-0033-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0033-01 | 1 | 6 体（`slime`・`goblin`・`skeleton`・`orc`・`darkKnight`・`necromancer`）それぞれの戦闘で、`[data-testid="enemy-window"]` の中に `[data-testid="enemy-image-frame"]` があり、`img` の `src` が `enemies/<種類>.png`（相対パス）で読み込めている（`complete` かつ `naturalWidth`・`naturalHeight` が 256。v1.2）。絵の枠の下端が敵の名前の上端と同じ（間 0px）で、絵は名前の上にある | E2E | `e2e/battle.spec.ts` |
| TC-0033-02 | 2 | `pixel7`・`small`・`desktop` と、`setViewportSize` で 414×715・1366×657 にしたとき、どれでも枠と `img` の `getBoundingClientRect` が幅 256・高さ 256。`img` の `image-rendering` が `pixelated` | E2E | `e2e/battle.spec.ts` |
| TC-0033-03 | 3 | `img` の `alt` が敵の名前と同じ（例：`necromancer` のとき「暗黒のネクロマンサー」、`darkKnight` のとき「ダークナイト」） | E2E | `e2e/battle.spec.ts` |
| TC-0033-04 | 4 | `page.route('**/enemies/*.png', r => r.abort())` で絵を読めなくすると、`[data-testid="enemy-image-frame"]` がなくなり、敵の名前だけが出る。`pageerror` が出ず、ErrorPanel（「きろくを よみかき できません」）も出ない。そのあと「たたかう」で戦闘が続けられる | E2E | `e2e/battle.spec.ts` |
| TC-0033-05 | 5 | §13.5 の 4 つ：各種類（`ENEMIES` のキー）の `public/enemies/<種類>.png` がある／PNG の署名 `89 50 4E 47 0D 0A 1A 0A`、12〜15 バイトが `IHDR`、16・20 バイト目からの 32 ビット BE の幅・高さが 256・256（v1.2。加えてビット深度 8・カラータイプ 6（RGBA））／MD5 が §13.1 の表と同じ（slime `c5fed93d07e3f2c1bdb5b14da661d597`、goblin `480285da5605c87912288a3dac40d796`、skeleton `2d04fbc3b88264e7acacc251ef35af04`、orc `9b9153c28e912c0c16db6b1d9cded4f1`、darkKnight `26fe01578e1da2a8ba6e0e581ca4a8a4`、necromancer `6fa856ff00c6e18be8a45aa8a96f58b4`。v1.2）／`public/enemies/` の PNG が種類の一覧とちょうど同じ（余分なファイルがない） | 単体 | `tests/assets/enemy-images.test.ts` |
| TC-0033-06 | 2 | iPhone 11 と PC で、敵の絵（256×256）がぼやけず、細かいところまで見える。絵が枠や名前と重ならない（v1.1 で足した。v1.2 で 256×256 の絵に） | 手動 | 実機（iPhone 11・PC） |

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

| 確認 ID | 手順 | 見ること |
| --- | --- | --- |
| TC-0033-06 | iPhone 11 の Safari（またはホーム画面のアプリ）と PC のブラウザで公開 URL を開き、ダンジョンを歩いて敵に出会う。出会った敵の絵を、腕を伸ばした距離で見る。6 体すべてを探さなくてよい（6 枚がそろい、大きさと描き方が同じことは TC-0033-01・02・05 で確かめる） | 絵がぼやけず、細かいところまで見える。絵と敵の名前が重ならない。見た敵の名前を返事に書く |
