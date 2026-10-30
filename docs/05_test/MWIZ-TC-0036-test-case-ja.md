---
id: MWIZ-TC-0036
type: Test Case
title: キーボード・読み上げでも遊べる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0036（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0003（v1.0）
  - MWIZ-GUI-0001（v1.1）
  - docs/specification-ja.md (v1.2) §11.5、§11.11、§14、§16.4
verified: null
---

# TC-0036 キーボード・読み上げでも遊べる

- 対象：[US-0036](../02_requirements/MWIZ-US-0036-user-story-ja.md)（受け入れ条件 5 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0036-01 | 1 | キーボード（Tab・Shift+Tab・↑↓←→・Enter・Space・Esc と名前の文字入力）だけで、タイトル →「はじめから」→ 名前入力 → 宿屋（やすむ・セーブ・メニュー・そうび・もちもの・ステータス・おと）→ ダンジョン（移動・階段・宿屋へ戻る・ヒール）→ 戦闘（たたかう・ヒール・にげる）→ 入れ替え → ゲームクリア →「宿屋へ」→ タイトルへ戻る、まで進められる。マウス・タップを 1 回も使わない | E2E（キー、`desktop`） | `e2e/a11y.spec.ts` |
| TC-0036-02 | 1 | Tab でフォーカスを移したボタン・メニュー・入力欄で、`:focus-visible` の `outline` が `2px solid rgb(255, 200, 69)`（`#FFC845`）、`outline-offset` が 2px。マウスで操作する広い画面のメニューの行はリングの代わりに「▶」と琥珀の文字で示す | E2E（キー、`desktop`） | `e2e/a11y.spec.ts` |
| TC-0036-03 | 2 | 宿屋・ダンジョンの GameMenu を Esc（または「もどる」）で閉じると、フォーカスが「メニュー」ボタンに戻る。そうび・もちもの・ステータスを閉じると、開いたメニューの項目に戻る。確認（ConfirmMenu）を閉じると、開いた項目に戻る | E2E（キー、`desktop`） | `e2e/menu.spec.ts` |
| TC-0036-04 | 2 | ConfirmMenu・GameMenu・ステータス・もちもの一覧を開いているあいだ、Tab・Shift+Tab を 20 回押しても `document.activeElement` がその中から出ない | E2E（キー、`desktop`） | `e2e/menu.spec.ts` |
| TC-0036-05 | 3 | `app:sound` が出る出来事のたびに、メッセージ欄（`role="log"`）に文の行がある：`encounter` →「〇〇が あらわれた！」、`levelUp` →「レベルが あがった！ Lv{n}」、`rareDrop`・`rareDropLG` →「〇〇は 名前［UR］（…）を おとした！」（［LG］）、`bossAppear` →「暗黒のネクロマンサーが あらわれた！」、`bossDefeat` →「暗黒のネクロマンサーを たおした！」、`clear` →「ダンジョンに 平和が もどった」、`toggle`（ゲーム中）→「おとを オンにした」 | E2E | `e2e/a11y.spec.ts` |
| TC-0036-06 | 3 | 色だけに頼らない：HP が最大の 25% 以下で HP の行に「！」の文字が出る。ドロップの行・一覧の項目に［N］［R］［SR］［UR］［LG］の文字が出る。地図の階段に「↓」「↑」「入」の記号、足元のボタンに「↓ おりる」「↑ のぼる」「宿屋へ戻る」の文字。並び順に「つよい じゅん」「よわい じゅん」の文字。選べない項目に `aria-disabled="true"` | E2E | `e2e/a11y.spec.ts` |
| TC-0036-07 | 4 | `describeView` が §11.5 の順で文をつなぐ：「{階}F {向き}を向いている。」→ 正面の壁（「前方は かべ。」／「前方 {k} マス先は かべ。」／「前方は {段の数−1} マス先まで つうろ。」）→「左に わかれみち。」「右に わかれみち。」→「{k} マス先に くだり階段。」など → 足元（「ここは入口。」／「足元に くだり階段。」）。例の視界で「3F 北を向いている。前方 2 マス先は かべ。左に わかれみち。足元に くだり階段。」に等しい | 単体 | `tests/logic/describe-view.test.ts` |
| TC-0036-08 | 4 | 疑似3D の `<svg>` が `role="img"` で、`aria-label` が `describeView` の結果と同じ。地図の `<svg>` が `role="img"`、`aria-label` が「{階}F の地図。踏破済み {N} マス。」（N は踏破済みのマスの数。例：3 マス踏破した 3F で「3F の地図。踏破済み 3 マス。」） | E2E | `e2e/dungeon.spec.ts` |
| TC-0036-09 | 4 | VoiceOver で、疑似3D・地図の説明文、メッセージ欄に新しく出た行、メニューの項目と選べない理由が読み上げられる | 手動 | 実機（iPhone 11）または PC |
| TC-0036-10 | 5 | `@axe-core/playwright` で、タイトル・名前入力・宿屋・ダンジョン・戦闘・ゲームクリア・そうび・もちもの・入れ替え・ステータスの各画面と、GameMenu・ConfirmMenu・演出（rareDrop・bossAppear）・ErrorPanel を出した状態で、`violations` が 0 件 | E2E | `e2e/a11y.spec.ts` |

## 2. 準備

- 単体：`describeView` に `toFirstPersonView` の形の視界（`floor`・`facing`・`underfoot`・`depths`）を直接渡す。
- E2E：`?debug=1` で開き、各画面の状態を `__wiz.writeState`・`writeSave`・`useSeed` で作る（`e2e/helpers.ts` の `startAt`）。`app:sound` は `addInitScript` で記録する。ErrorPanel は `Storage.prototype.setItem` を例外を投げるものに替えてから操作して出す。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0036-01 | 空の端末内保存で開き、`page.keyboard` だけで表の順に進める（戦闘・ドロップ・満杯・ボスは `useSeed` と `writeState` で途中の状態を作ってよいが、各画面の中の操作はキーで行う）。各画面で `body[data-screen]` が変わったことを確かめる |
| TC-0036-02 | 各画面で Tab を押し、`document.activeElement` の `getComputedStyle` の `outline`・`outline-offset` を見る |
| TC-0036-03 | 宿屋で「メニュー」に Enter → Esc → `activeElement` が「メニュー」ボタン。メニュー →「もちもの」→ 閉じる →「もちもの」の項目にフォーカス。ダンジョンでも同じ |
| TC-0036-04 | 各メニュー・確認を開いて Tab を 20 回・Shift+Tab を 20 回押し、毎回 `activeElement` がその要素の中にあるかを見る |
| TC-0036-05 | 音をオンにし、TC-0032 の場面（遭遇・レベルアップ・UR／LG のドロップ・ボス出現・ボス撃破・クリア・おと）を順に作り、`app:sound` が出たときのメッセージ欄の文を見る |
| TC-0036-08 | 3F・北向き・足元が下り階段・前方 2 マス先が壁・左に通路、の状態で開き、2 つの `<svg>` の `aria-label` を見る |
| TC-0036-10 | 各画面・各状態を出すたびに `new AxeBuilder({ page }).analyze()` を呼ぶ |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0036-09 | iPhone 11 の VoiceOver（または PC の Windows ナレーター）をオンにして、タイトル → 宿屋 → ダンジョン（前進・回転）→ 戦闘を、読み上げを聞きながら操作する（任意。主な画面だけ） | 画面名、メニューの項目、疑似3D・地図の説明文、新しいメッセージの行が日本語で読み上げられる。「【 】」・カーソル記号・演出の層は読まれない。できなかったときは AC の「確認できなかったこと」に書く |
