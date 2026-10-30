---
id: MWIZ-TC-0026
type: Test Case
title: 実績とステータスを見る
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0026（v1.1）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0003（v1.0）
  - docs/specification-ja.md (v1.2) §9.4、§11.5、§11.7、§16.1
verified: null
---

# TC-0026 実績とステータスを見る

- 対象：[US-0026](../02_requirements/MWIZ-US-0026-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0026-01 | 1 | 初期の実績 `{ 0, 0, 0, 1, 0 }` のキャラクターが、ゲーム API で 5F のボスのマスに入り、その 1 戦目でボスを倒すと、実績が `{ battles: 1, kills: 1, deaths: 0, laps: 2, bossKills: 1 }` | 単体 | `tests/api/game-api.test.ts` |
| TC-0026-02 | 2 | 遭遇して逃走に成功すると `battles` だけが 1 増える。通常の敵に勝つと（遭遇の分の `battles` のほかは）`kills` だけが 1 増え、`bossKills`・`laps` は変わらない | 単体 | `tests/domain/records.test.ts` |
| TC-0026-03 | 3 | `normalizeRecords({ battles: -1, kills: 1.5, deaths: "2", laps: 0, bossKills: 3 })` が `{ battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 3 }`。オブジェクトでない値（null・文字列）は初期値 `{ 0, 0, 0, 1, 0 }` | 単体 | `tests/domain/records.test.ts` |
| TC-0026-04 | 4 | 狭い画面（`pixel7`・`small`）で、宿屋の「メニュー」→「ステータス」を選ぶと、画面名「ステータス」の画面に替わる。左のウィンドウ（見出しは名前）に Lv・EXP・HP・MP・こうげき・ぼうぎょ・すばやさ（補正があれば「 (+n)」）、右のウィンドウ「じっせき」に「このキャラクターの きろく」と、そうせんとう「128 回」・とうばつ「120 体」・しぼう「3 回」・しゅうかい「2 周目」・ボスとうばつ「1 回」が出る。メッセージ欄（`[data-testid="message-window"]`）はない。「もどる」で宿屋に戻り、フォーカスが「メニュー」にある。ダンジョンの「≡ メニュー」からも開け、戻るとフォーカスが「≡ メニュー」にある | E2E | `e2e/status.spec.ts` |
| TC-0026-05 | 4 | 狭い画面（`setViewportSize` で 414×715）のステータス画面で Esc を押すと、「もどる」と同じく元の画面に戻る | E2E（キー、`desktop`） | `e2e/status.spec.ts` |
| TC-0026-06 | 5 | 広い画面（`desktop`）の宿屋に、見出し「ステータス」のウィンドウ（1 行目「なまえ」と名前、能力値は補正つき）と、見出し「じっせき」のウィンドウ（TC-0026-04 と同じ中身）が並んで出る。「メニュー」を開くと項目が もどる・そうび・もちもの・おと で、「ステータス」がない | E2E | `e2e/inn.spec.ts` |
| TC-0026-07 | 5 | 狭い画面でステータス画面を出したまま、`setViewportSize` で幅 1280 にすると、宿屋の画面（実績つき）に戻る | E2E | `e2e/status.spec.ts` |

## 2. 準備

- 単体：`tests/helpers/fixtures.ts` の初期キャラクター。TC-0026-01 は `tests/helpers/maps.ts` の `openMap(player, extra, 5)` でボスのマスの手前に立つ状態を偽の保存に書く。入ったときに作られるボス（HP 260）と戦うので、こうげきの高いキャラクター（実績は初期値のまま）にし、`SequenceRng` で攻撃が当たり続ける値を渡す。TC-0026-02 は `explore`・`battle` の関数を続けて呼ぶ（遭遇 → 逃走、遭遇 → 勝利）。
- E2E：`?debug=1` で開き、`startAt('INN', …)` で実績 `{ battles: 128, kills: 120, deaths: 3, laps: 2, bossKills: 1 }`、さいだいHP +15・こうげき +10 の装備をした状態から始める。ダンジョンからの確かめは `startAt('DUNGEON', …)`。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0026-04 | 宿屋の「メニュー」→「ステータス」→ 画面名と 2 つのウィンドウの見出し・`<dl>` の `dt`／`dd` の文字を見る →「もどる」→ `document.activeElement` が宿屋の CommandMenu の「メニュー」の行であること。ダンジョンでも同じことをして、`document.activeElement` が「≡ メニュー」のボタンであること |
| TC-0026-05 | `setViewportSize({ width: 414, height: 715 })` → 宿屋の「メニュー」→「ステータス」→ Esc → 宿屋の画面に戻り、フォーカスが「メニュー」にあること |
| TC-0026-06 | 宿屋を開き、「ステータス」「じっせき」の 2 つのウィンドウが横に並ぶ（`getBoundingClientRect` の top が同じ）こと →「メニュー」→ `role="menuitem"` の文字が 4 つ（もどる／そうび／もちもの／おと：オフ）であること |
| TC-0026-07 | `setViewportSize({ width: 414, height: 715 })` でステータス画面を開く → `setViewportSize({ width: 1280, height: 800 })` → 画面名が「宿屋」で、「じっせき」のウィンドウがあること |

## 4. 手動の手順

なし。
