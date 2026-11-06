---
id: MWIZ-TC-0032
type: Test Case
title: 効果音を鳴らす・切り替える
status: stable
version: 1.1
updated: 2026-11-06
sources:
  - MWIZ-US-0032（v1.2）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0003（v1.4）
  - MWIZ-TD-0005（v1.8）
  - docs/specification-ja.md (v1.7) §12.1、§15.5、§16.5、§25
verified: null
---

# TC-0032 効果音を鳴らす・切り替える

- 対象：[US-0032](../02_requirements/MWIZ-US-0032-user-story-ja.md)（受け入れ条件 13 個）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0032-01 | 1 | 音の設定は、`mini-wiz-game-sound` がない・`'off'`・別の値・読めないときはオフ、`'on'` のときだけオン | 単体 | `tests/audio/sound-setting.test.ts` |
| TC-0032-02 | 1 | 端末内保存が空の状態で開くと、タイトルのメニューの 3 番目に「おと：オフ」が出て、`app:sound` イベントが 1 つも出ない | E2E | `e2e/sound.spec.ts` |
| TC-0032-03 | 2 | タイトルで「おと：オフ」を選ぶと「おと：オン」に変わり、`app:sound` が `{ name: 'toggle', muted: false }` で 1 回出る。`localStorage['mini-wiz-game-sound']` が `'on'`。タイトルにメッセージ欄（`data-testid="message-window"`）はない | E2E | `e2e/sound.spec.ts` |
| TC-0032-04 | 2 | ゲーム中（ダンジョン）の「メニュー → おと」でオンにすると、メッセージ欄に「おとを オンにした」が出る | E2E | `e2e/sound.spec.ts` |
| TC-0032-05 | 3 | 「おと：オン」にしてから再読み込みすると、タイトルのメニューに「おと：オン」が出る | E2E | `e2e/sound.spec.ts` |
| TC-0032-06 | 4 | 保存の `setItem` が例外を投げても、`toggle()` は例外を出さず、その場でオン／オフが切り替わる | 単体 | `tests/audio/sound-setting.test.ts` |
| TC-0032-07 | 5 | ゲーム中の「メニュー → おと」で切り替えてもメニューは開いたまま、項目が「おと：オン」⇔「おと：オフ」に変わる。オフにしたときはメッセージ欄に「おとを オフにした」が出て、`toggle` の `app:sound` は出ない | E2E | `e2e/sound.spec.ts` |
| TC-0032-08 | 6 | 音がオンで通常の敵に遭遇すると、メッセージ欄が空になってから `app:sound` が `{ name: 'encounter', muted: false }` で 1 回出て、そのあと「〇〇が あらわれた！」が出る。戦闘中に「たたかう」を押したターン（BATTLE → BATTLE）では `encounter` は出ない | E2E | `e2e/sound.spec.ts` |
| TC-0032-09 | 6 | `sfxDuration('encounter')`（`SFX_MS.encounter`）が 680ms で、`SFX.encounter` の出来事の終わり（`at + len`）のいちばん遅いものと同じ（v1.1） | 単体 | `tests/audio/sound.test.ts` |
| TC-0032-10 | 7 | 音がオンでボスのマスに入ると、`encounter` の `app:sound` は出ず、「暗黒のネクロマンサーが あらわれた！」の行が出たときに `{ name: 'bossAppear', muted: false }` が出る。`sfxDuration('bossAppear')` は 1,200ms（v1.1） | E2E | `e2e/sound.spec.ts` |
| TC-0032-11 | 8 | 音がオンのとき、次の行が出た瞬間（偽の時計で同じ時刻）に `app:sound` が出る：「レベルが あがった！」→ `levelUp`、UR のドロップの行 → `rareDrop`、LG のドロップの行 → `rareDropLG`、「暗黒のネクロマンサーを たおした！」→ `bossDefeat`、「ダンジョンに 平和が もどった」→ `clear` | E2E | `e2e/sound.spec.ts` |
| TC-0032-12 | 9 | `stopSfx()` で鳴っている効果音のノードがすべて `stop()` され、`sfxRemainingSec()` が 0 になり、受け手に 0 が知らされる | 単体 | `tests/audio/sound.test.ts` |
| TC-0032-13 | 9 | 演出中にメッセージ欄をクリック（`desktop` では Enter・Space も）すると、その時点で効果音の発振器の `stop()` が呼ばれる（`addInitScript` で `AudioScheduledSourceNode.prototype.stop` を包んで呼び出しを記録する） | E2E | `e2e/sound.spec.ts` |
| TC-0032-14 | 10 | 音がオフのとき、遭遇・ボス出現・レベルアップ・ドロップ・ボス撃破・クリアのどれでも、`app:sound` は `muted: true` で出て、`AudioContext` の発振器は作られない（`addInitScript` で `OscillatorNode` の作成を数える） | E2E | `e2e/sound.spec.ts` |
| TC-0032-15 | 11 | `globalThis.AudioContext`・`webkitAudioContext` がないとき、`audioContext()` が `null` を返し、`playSfx`・`stopSfx`・`sfxRemainingSec` が例外を出さない（残りは 0） | 単体 | `tests/audio/sound.test.ts` |
| TC-0032-16 | 11 | `addInitScript` で `window.AudioContext`・`webkitAudioContext` を消して開き、音をオンにして遭遇・戦闘・レベルアップまで遊ぶ。`pageerror` が出ず、ErrorPanel も出ない | E2E | `e2e/sound.spec.ts` |
| TC-0032-17 | 12 | 偽の `AudioContext` が `suspended` で作られると、`window` に capture で `pointerdown`・`pointerup`・`touchend`・`click`・`keydown` の受け手が付き、入力のたびに `resume()` が呼ばれる。`running` になったら受け手が外れ、以後は呼ばれない。Shift だけのキーで `running` にならなかったときは、次の入力でもう一度呼ばれる。初めから `running` なら呼ばれない | 単体 | `tests/audio/sound.test.ts` |
| TC-0032-18 | 12 | iPhone 11 の Safari で、音をオンにして保存してから開き直し、最初のタップで音（タイトルの曲・そのあとの効果音）が出る | 手動 | 実機（iPhone 11） |
| TC-0032-19 | 13 | `SFX` の 8 種類が §25.2 と同じ（v1.1）：長さ `SFX_MS`（levelUp 510・rareDrop 360・rareDropLG 1,020・bossAppear 1,200・bossDefeat 500・clear 2,350・toggle 80・encounter 680 ms）が出来事の終わりのいちばん遅いものと同じ。出来事の周波数・頭・長さ・音色が §25.2 のコードと同じ（例：levelUp は 262・311・392・523 Hz が 0・90・180・270 ms から「沈んだ金管」で、最後だけビブラート。encounter は A2・B♭2 の和音 1 つが 0〜680 ms・glide 1.14。clear は 5 つの出来事）。偽の `AudioContext` で、出来事ごとにローパス（`patch.lowpass`・Q 0.7）が `destination` につながり、和音の音の数だけ搬送波・変調波の組が作られ、`start` が頭、`stop` が `min(効果音の終わり, 頭 + len)`、glide のある音は周波数に `exponentialRamp` が予約され、1 音の音量の行き先が `vol ÷ √和音の音数`。音色 8 種の値が §25.2 のコードと同じ | 単体 | `tests/audio/sound.test.ts` |
| TC-0032-20 | 2、6〜9、13 | 実機で音を聴く：オンにしたときの「ピッ」、遭遇・ボス出現・レベルアップ・UR／LG のドロップ・ボス撃破・クリアの音が、その出来事のときに 1 つずつ鳴り、飛ばすとすぐ止まる | 手動 | 実機（iPhone 11・PC） |

## 2. 準備

- 単体：`tests/helpers/fake-audio.ts` の `installFakeAudio(state)` で `globalThis.AudioContext` を偽物にする。`sound.ts` は状態を持つので、テストごとに `vi.resetModules()` のあと `await import()` し直す。`sound-setting` には `tests/helpers/fake-storage.ts`（書き込みを失敗させられる）を渡す。
- E2E：`?debug=1` で開き、`addInitScript` で `window` の `app:sound` を配列に記録する。音をオンにするときは `localStorage['mini-wiz-game-sound'] = 'on'` を先に書くか、タイトルの「おと」を選ぶ。場面は `__wiz.writeState` と `__wiz.useSeed` で作る（`e2e/helpers.ts` の `startAt`）。時間は偽の時計で進める。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0032-03 | 空の端末内保存で開く → 「おと：オフ」を選ぶ → 項目の文字、記録した `app:sound`、`localStorage` を見る |
| TC-0032-04 | `startAt('DUNGEON', …)`（音はオフ）→「メニュー」→「おと：オフ」を選ぶ → メッセージ欄の最後の行が「おとを オンにした」 |
| TC-0032-07 | 音をオンにしてダンジョンへ →「メニュー」→「おと：オン」を選ぶ → メニュー（`role="menu"`）が見えたまま、項目が「おと：オフ」、メッセージ欄に「おとを オフにした」、`toggle` の記録が増えない |
| TC-0032-08 | 次の前進で通常の敵に遭遇するシードにして ↑（タッチではボタン）→ 記録の順が「メッセージ欄が空 → `encounter` → あらわれたの行」。続けて「たたかう」→ `encounter` が増えない |
| TC-0032-10 | 5F のボスのマスの手前で前進 → `encounter` がなく、`bossAppear` が 1 回 |
| TC-0032-11 | 勝つとレベルアップして UR を落とす戦闘、LG を落とす戦闘、HP 1 のボス戦をそれぞれ作り、偽の時計で 100ms ずつ進め、行が出た時刻と `app:sound` の時刻が同じことを確かめる |
| TC-0032-13 | `stop` の記録を仕込んでおき、levelUp の演出が立った直後にメッセージ欄をクリック → クリックの後に `stop` の記録が増えている |
| TC-0032-14 | 音がオフのまま TC-0032-08・10・11 と同じ操作をする |
| TC-0032-16 | `addInitScript(() => { delete window.AudioContext; delete window.webkitAudioContext; })` → 音をオンにして TC-0032-08 のあと勝つまで遊ぶ |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0032-18 | iPhone 11 の Safari で公開 URL を開き、「おと：オン」にする。Safari を閉じて開き直し、何も触らずに待ってから、画面を 1 回タップする | 触る前は音が出ない。最初のタップのあとにタイトルの曲が聞こえる。そのあと遭遇などの効果音も鳴る |
| TC-0032-20 | iPhone 11 の Safari と PC の Chrome で、音をオンにして、オンにする → 遭遇 → レベルアップ → ドロップ（UR・LG は `?debug=1` の場面で作る）→ ボス出現 → ボス撃破 → クリアまで遊ぶ。途中で演出をタップ（PC は Enter）で飛ばす | オンにした瞬間に低い木の音の短い「コッ」。遭遇はぶつかり合う低い和音が迫ってきて消える音、レベルアップは沈んだ金管の短調のファンファーレ、UR・LG は暗い鐘の低いアルペジオ（LG は長く、最後に長い音）、ボス出現は地の底からうなる低い音、ボス撃破は和音が沈んで崩れ落ちる音、クリアは短調から長調へ移る静かな和音（1.5 秒で切れる）。試聴ページで選んだ音と同じに聞こえる。音が割れたり重なったりしない。飛ばすと音がすぐ止まる（v1.1） |
