---
id: MWIZ-AC-0017
type: Attested Computation
title: 効果音と音の設定の実施記録
status: stable
version: 1.0
updated: 2026-11-04
sources:
  - MWIZ-TASK-0017（v1.0）
  - MWIZ-TC-0006（v1.4）
  - MWIZ-TC-0010（v1.1）
  - MWIZ-TC-0026（v1.1）
  - MWIZ-TC-0032（v1.2）
  - MWIZ-TD-0005（v1.13）
verified: { by: "tsuku3dayo", at: "2026-11-04T15:56:00+09:00" }
---

# AC-0017 効果音と音の設定の実施記録

## 1. 実施概要

| 項目 | 内容 |
| --- | --- |
| タスク | [TASK-0017](../06_plan/MWIZ-TASK-0017-implementation-task-ja.md) 効果音と音の設定 |
| 実施者 | Claude Code（オーナー：tsuku3dayo） |
| ブランチ | `feat/TASK-0017-sound` |
| 環境 | Windows 11・PowerShell、Node.js v24.0.0。Playwright 1.64.1 の Chromium |

作ったもの：

- `audio/sound.ts`：効果音 8 種（仕様書 §25.2 の並び）の合成と予約、`playSfx`・`stopSfx`・`sfxRemainingSec`・`sfxDuration`・`onSfx`、共用の `audioContext()`（suspended なら入力のたびに `resume`）、`sfx(name, { muted })`（`app:sound` イベントを出し、muted でなければ鳴らす）
- `audio/sound-setting.ts`：オン／オフ（初期オフ、`mini-wiz-game-sound` に `'on'`／`'off'`）、`soundLabel`、保存できなくてもその場で切り替わる
- つなぎ（`main.ts`）：演出の始まりで効果音（LG のドロップは `rareDropLG`）、演出の終わり・スキップで `stopSfx`、通常の敵との遭遇で `encounter`（ボスでは鳴らさない）、オンにした瞬間に `toggle`
- 画面：タイトルのメニューの「おと」（項目の文字だけ替える）、宿屋・ダンジョンの GameMenu の「おと」（メニューは開いたまま、メッセージ欄に「おとを オンにした」／「おとを オフにした」）。画面には `ScreenContext.sound` で渡す
- `tests/helpers/fake-audio.ts`：偽の `AudioContext`（発振器・ゲイン・接続・音量の予約を記録する）

設計の直し（TD-0005 v1.4）：`sound.ts` の関数の名前を仕様書 §25.3 に合わせ（v1.3 は `play`・`stop`）、`sfx` と、`main.ts` でのつなぎ方を書いた。音の設定は保存に文字列をそのまま書く（ゲームの保存の形は JSON にするので使わない）と書いた。参照する成果物の版の表記を直した（承認済みの AC-0006 は表記だけ）。

TC の準備との違い：TC-0032 の準備は「`sound-setting` には `tests/helpers/fake-storage.ts` を渡す」だが、`fake-storage.ts` はゲームの保存の形（JSON）なので、音の設定のテストでは同じ働き（書き込みを失敗させられる）のメモリの Web Storage をテストの中に作った。

## 2. 確認結果

| 確認 ID | 方法 | 結果 |
| --- | --- | --- |
| TC-0032-01 | 単体（`tests/audio/sound-setting.test.ts`） | OK。キーなし・`off`・`ON`・`"on"`・読めない・保存なしはオフ、`on` だけオン。切り替えると `on`／`off` を書き、オンにしたときだけ確認音 |
| TC-0032-06 | 単体（同上） | OK。`setItem` が例外でも `toggle` は例外を出さず、オン → オフと切り替わる |
| TC-0032-09 | 単体（`tests/audio/sound.test.ts`） | OK。encounter 680ms・13 個・頭は休符でない・矩形波だけ |
| TC-0032-19 | 単体（同上） | OK。8 種の波形・周波数・長さが §25.2 と同じ。予約は 10 秒から隙間なく続き、休符はノードを作らない。音量は 0 → 5ms で 0.08 → 終わりの 5ms 前まで 0.08 → 0 |
| TC-0032-12 | 単体（同上） | OK。levelUp の残り 0.51 → 0.3 秒後 0.21、`stopSfx` で全部の発振器が `stop()`、残り 0、受け手に 0.51・0 |
| TC-0032-15 | 単体（同上） | OK。`AudioContext`・`webkitAudioContext` がないと `null`、鳴らす・止める・残りが例外なし（0） |
| TC-0032-17 | 単体（同上） | OK。suspended で 5 つの受け手（capture）、running にならなければ次の入力でまた `resume`、running になると外れて以後は呼ばない。初めから running なら付けない |
| TC-0006-01 | E2E（`e2e/title.spec.ts`。pixel7・small・desktop） | OK。飾り線 2 本（aria-hidden）・「WIZ」・副題・はじめから／つづきから／おと：オフ・インストール・「v1.0」、メッセージ欄なし |
| TC-0010-06 | E2E（`e2e/menu.spec.ts`。pixel7・small） | OK。宿屋は もどる・そうび・もちもの・ステータス・おと：オフ（カーソル そうび）、ダンジョンは ヒール を足して（無効でも）カーソル ヒール。もどるで閉じる |
| TC-0010-11 | E2E（同上） | OK。宿屋のメニューで おと：オン／オフ、メニューは開いたまま・カーソルも同じ行、「おとを オンにした」・`on`、もう一度で「おとを オフにした」・`off` |
| TC-0026-06 | E2E（`e2e/inn.spec.ts`。desktop） | OK。「ステータス」（なまえ・「 25/ 61 (+15)」「 17 (+10)」）と「じっせき」が横に並び、メニューは もどる・そうび・もちもの・おと：オフ |
| TC-0032-02 | E2E（`e2e/sound.spec.ts`） | OK。保存が空なら 3 番目が「おと：オフ」、`app:sound` は 0 件 |
| TC-0032-03 | E2E（同上） | OK。「おと：オン」になり、`{ toggle, muted: false }` が 1 件、保存は `on`、メッセージ欄なし |
| TC-0032-04 | E2E（同上） | OK。ダンジョンのメニューでオンにすると「おとを オンにした」 |
| TC-0032-05 | E2E（同上） | OK。再読み込みしても「おと：オン」 |
| TC-0032-07 | E2E（同上） | OK。オフにしてもメニューは開いたまま・「おと：オフ」・「おとを オフにした」・toggle 0 件。もう一度オンで toggle 1 件 |
| TC-0032-08 | E2E（同上） | OK。「かべだ」のあと遭遇すると、メッセージ欄が 0 行のときに `{ encounter, muted: false }` が 1 件、そのあと「スライムが あらわれた！」。「たたかう」では増えない |
| TC-0032-10 | E2E（同上） | OK。ボスのマスでは encounter なし、`bossAppear` が 1 件 |
| TC-0032-11 | E2E（同上） | OK。1 行目からの時刻：UR の場面 levelUp 1600・rareDrop 3000、LG の場面 levelUp 1600・rareDropLG 3000、ボスの場面 bossDefeat 400・levelUp 1400・2800・4200・rareDropLG 5600・clear 6800。最初の演出の行は 1ms 前には音が出ず、ちょうどの時刻に出る |
| TC-0032-13 | E2E（同上） | OK。levelUp の演出中にメッセージ欄を押す（desktop はクリック・Enter・Space）と `stop()` の呼び出しが増え、演出が終わる |
| TC-0032-14 | E2E（同上） | OK。音がオフで、遭遇・ボス出現・レベルアップ・UR・LG・ボス撃破・クリアの 7 種がすべて `muted: true`、発振器は 0 個 |
| TC-0032-16 | E2E（同上） | OK。`AudioContext` を消したブラウザで、オン → 遭遇 → レベルアップ・ドロップまで、`pageerror` なし・ErrorPanel なし（toggle・encounter・levelUp・rareDrop の判断は出ている） |
| TC-0032-20 | 手動（iPhone 11・PC の Chrome。2026-11-04、オーナー） | OK（下の「WS-0007 の終わりの手動テスト」） |

手元で通したもの（2026-11-04）：

- `npm run verify`：lint エラー 0、check:docs エラー 0（注意 1：まだテストのない確認 ID。テストにある確認 ID は 232 → 254 で、この TASK の自動の 22 個の分だけ増えた）、単体 163 件、build、check:dist OK
- `npm run test:e2e`：356 件通った・31 件はその端末の対象外で飛ばした
- スクリーンショット：撮っていない。画面の並びは変えず、メニューの項目の文字（「おと：オン」／「おと：オフ」）とメッセージの行が替わるだけのため。文字は E2E で確かめた

CI の結果（PR #56、2026-11-04）：`check`（verify）OK 42 秒、`e2e` OK 3 分 29 秒。マージのあと、main の test・pages も成功した。

### WS-0007 の終わりの手動テスト（2026-11-04、オーナー）

PR #56 のマージ（公開）のあと、手順と「聴くこと」の一覧をオーナーに渡して確かめてもらった。

- iPhone 11：ホーム画面のアプリを開き直して「更新」→ タイトルでオン → ふつうに遊んで出せる音を聴く → 演出中にメッセージ欄をタップ
- PC の Chrome：`?debug=1` で開いてオン → 開発者ツールのコンソールで戦闘・ボスの場面を書き（UR・LG のドロップ、ボス出現、ボス撃破からクリア。作り方は手元で動くことを確かめてから渡した）→ 遭遇は歩いて出す → 演出中に Enter

| 聴くこと | 結果 |
| --- | --- |
| オンにした瞬間の「ピッ」 | OK |
| 遭遇・レベルアップ・UR・LG・ボス出現・ボス撃破・クリアが、その出来事のときに 1 つずつ鳴る | OK |
| 音が割れたり重なったりしない | OK |
| 飛ばすとすぐ止まる | OK |

オーナーの報告は「すべて OK」。iPhone で、ふつうに遊んでどの音まで出せたかは聞いていない（PC では全部の音を出せる手順）。

## 3. 確認できなかったこと

- 実際の音の聞こえ方は TC-0032-20 で聴いてもらい OK だった。iPhone 11 でどの音まで出せたか（レアな場面まで行けたか）は記録していない。
- TC-0032-18（iPhone の Safari で、保存したオンの設定のまま開き直し、最初のタップで音が出る）はこの TASK の担当ではない（タイトルの曲を作る BGM の TASK）。効果音が最初の入力で出ることは TC-0032-20 で一緒に見る。
- Android の実機はない（WS-0007 のとおり、E2E の `pixel7` で代わりに確かめた）。

## 4. 後片付け

- `dist/`・`playwright-report/`・`test-results/` は `.gitignore` に入っている。

## 5. 完了の定義

- [x] 上の自動の確認 ID のテストがすべてあり、通る
- [x] `npm run verify` と `npm run test:e2e` が手元で通る
- [x] 画面の変更は、PC と一番小さいスマートフォンの幅でスクリーンショットを見た（並びの変更なし。文字だけなので撮っていない）
- [x] 設計と違う作りにしたら、TD・GUI を直した（TD-0005 v1.4）
- [x] AC-0017（draft）に自動テストの結果を書き、同じ PR に入れた
- [x] PR の CI が緑（PR #56）
- [x] マージされた（マージ = 公開。2026-11-04、公開の実行が成功したことを確かめた）
