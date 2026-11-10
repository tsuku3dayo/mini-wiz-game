---
id: MWIZ-TC-0034
type: Test Case
title: 場面ごとの BGM を聴く
status: stable
version: 1.2
updated: 2026-11-09
sources:
  - MWIZ-US-0034（v1.2）
  - MWIZ-TST-0001（v1.1）
  - MWIZ-TD-0002（v1.6）
  - MWIZ-TD-0005（v1.10）
  - docs/specification-ja.md (v1.10) §12.2、§16.5、§26
verified: null
---

# TC-0034 場面ごとの BGM を聴く

- 対象：[US-0034](../02_requirements/MWIZ-US-0034-user-story-ja.md)（受け入れ条件 12 個）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。
- 画面を通した BGM の確かめは、TST-0001 §4 の表にあわせて `e2e/sound.spec.ts` に置く（仕様書 §26.11 の `e2e/bgm.spec.ts` は作らない）。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0034-01 | 1 | `sceneBgm(pathname, state, active)` が、`'/'`・`'/new'` → `'title'`、`'/inn'` → `'inn'`、`'/dungeon'`・`'/swap'`（`dungeon` あり）→ `'dungeon'`、`'/battle'` → `'battle'`（`state` なし、または `battle.isBoss` が false）、`'/battle'` で `battle.isBoss` が true → `'boss'` を返す | 単体 | `tests/logic/bgm-scene.test.ts` |
| TC-0034-02 | 1 | `playBgm(name)` で 1 周分（16 小節）の音が `今 + 0.05` から予約され、次の周の頭 `nextStart = t0 + loopSec` の 1 秒前を切ったときの見回り（250ms）で、`nextStart` から次の周が頭から予約される（すき間も重なりもない） | 単体 | `tests/audio/bgm.test.ts` |
| TC-0034-03 | 1 | 音がオンのとき、画面に入るたびに `app:bgm` が出る：タイトル `title`、名前入力でそのまま（イベントなし）、宿屋 `inn`、ダンジョン `dungeon`、通常の入れ替え画面でそのまま、戦闘 `battle`、ボス戦 `boss` | E2E | `e2e/sound.spec.ts` |
| TC-0034-04 | 1 | 実機で 6 曲を聴き、1 周（タイトル 48・宿屋 約 73.8・ダンジョン 約 33.3・戦闘 約 28.6・ボス戦 約 26.7・クリア 約 43.6 秒）の終わりで頭へ途切れずにつながる。ボス戦の曲（音が多い）で音が途切れたり遅れたりしない（v1.2） | 手動 | 実機（iPhone 11・PC） |
| TC-0034-05 | 2 | `state.location` が `CLEARED` のとき、どのパスでも（`'/clear'` でも）`'clear'`。状態がない `'/clear'` は `null`（v1.1） | 単体 | `tests/logic/bgm-scene.test.ts` |
| TC-0034-06 | 2 | クリア画面に入っているあいだ、最後の `app:bgm` が `{ name: 'clear' }` のまま変わらない（v1.1） | E2E | `e2e/sound.spec.ts` |
| TC-0034-07 | 3 | 鳴っている曲と同じ名前で `playBgm` を呼んでも、ノードが増えず、`out.gain` にフェードが予約されない（頭に戻らない） | 単体 | `tests/audio/bgm.test.ts` |
| TC-0034-08 | 3 | 宿屋で「メニュー」を開く → ステータスを開く → 閉じる、のあいだ `app:bgm` が 1 つも出ない。通常の敵のあとの入れ替え画面 → ダンジョンでも出ない | E2E | `e2e/sound.spec.ts` |
| TC-0034-09 | 4 | 違う曲で `playBgm` を呼ぶと、前の `out.gain` が `cancelScheduledValues(今)` → `setValueAtTime(現在値, 今)` → `linearRampToValueAtTime(0, 今 + 0.3)`、前のノードがすべて `stop(今 + 0.32)`、0.4 秒後に `out.disconnect()`。新しい曲は新しい `out` で 1 小節目から予約される | 単体 | `tests/audio/bgm.test.ts` |
| TC-0034-10 | 5 | `playBgm('battle', 0.68)` の 1 音目が `今 + 0.05 + 0.68` に予約される。`playBgm('title', 0.08)` は `今 + 0.05 + 0.08` | 単体 | `tests/audio/bgm.test.ts` |
| TC-0034-11 | 5 | 音がオンで通常の敵に遭遇すると、`app:sound`（`encounter`）のあとに `app:bgm`（`battle`）が出る。音がオフの状態でタイトルを開いて「おと：オフ」を選ぶと、`app:sound`（`toggle`）のあとに `app:bgm`（`title`）が出る | E2E | `e2e/sound.spec.ts` |
| TC-0034-12 | 6 | `sceneBgm` は `active.effect` が `bossAppear` または `bossDefeat` のとき、パスによらず `null` | 単体 | `tests/logic/bgm-scene.test.ts` |
| TC-0034-13 | 6 | 音がオンでボスのマスに入ると、bossAppear の演出が立ったときに `app:bgm` `{ name: null }`、演出の 1200ms が過ぎたときに `{ name: 'boss' }`。演出中にメッセージ欄をクリックしたときは、その場で `{ name: 'boss' }` | E2E | `e2e/sound.spec.ts` |
| TC-0034-14 | 7 | `sceneBgm` が、`location` が `SWAP` で `dungeon === null` のとき `'clear'`（v1.1。ただし戦闘の画面 `'/battle'` で `defeatShown` が false＝とどめの一撃のあと撃破の行がまだのときは `null`。`'/swap'`・`'/clear'` では `defeatShown` によらず `'clear'`）、`SWAP` で `dungeon` があるとき（`'/swap'`）`'dungeon'` | 単体 | `tests/logic/bgm-scene.test.ts` |
| TC-0034-15 | 7 | ボスを倒すと bossDefeat の演出で `app:bgm` `{ name: null }` が出て、演出が終わると `{ name: 'clear' }`。そのあと撃破のメッセージ・クリア画面のあいだ次の `app:bgm` が出ない。所持品 50 個でボスを倒したときの入れ替え画面でも `clear` のまま出ない。入れ替え画面で再読み込みすると `{ name: 'clear' }`。クリア画面の「宿屋へ」で `{ name: 'inn' }`（v1.1） | E2E | `e2e/sound.spec.ts` |
| TC-0034-16 | 8 | 通常の敵に勝つと、勝利のメッセージを出しているあいだ（`body[data-screen]` が `battle`）は `app:bgm` が出ず、ダンジョン画面に移ったときに `{ name: 'dungeon' }`。倒れたときは宿屋に移ったときに `{ name: 'inn' }` | E2E | `e2e/sound.spec.ts` |
| TC-0034-17 | 9 | 効果音を鳴らすと（`duckBgm(sec)`）、`bus.gain` に `setTargetAtTime(0.0105, 今, 0.02)` と `setTargetAtTime(0.035, 今 + sec, 0.02)` が予約される。前の効果音の途中で次が鳴ったら、遅いほうの終わりまで下げたまま。`duckBgm(0)`（止めた）ではすぐ 0.035 に戻す | 単体 | `tests/audio/bgm.test.ts` |
| TC-0034-18 | 9 | 実機で、曲が鳴っているときに効果音を鳴らすと、曲が小さくなり、効果音が終わると元の大きさに戻る | 手動 | 実機（iPhone 11・PC） |
| TC-0034-19 | 10 | `stopBgm()` で見回りが止まり、今の曲が 0.3 秒でフェードアウトする（TC-0034-09 と同じ予約）。始まりを遅らせて待っている曲も、停止のあとに音が鳴らない | 単体 | `tests/audio/bgm.test.ts` |
| TC-0034-20 | 10 | ダンジョンで「メニュー → おと」でオフにすると、`app:bgm` `{ name: null }` が出る | E2E | `e2e/sound.spec.ts` |
| TC-0034-21 | 11 | 音がオンのダンジョンで、`page.evaluate` で `Storage.prototype.setItem` を例外を投げるものに替えてから前進 → ErrorPanel（「きろくを よみかき できません」）が出ても、`app:bgm` が出ない（`dungeon` のまま） | E2E | `e2e/sound.spec.ts` |
| TC-0034-22 | 12 | `bgm-tracks` が §26.9 と同じ：6 曲の bpm・bpb・bars・1 周の秒（title 60・3・16・48.00、inn 52・4・16・73.85、dungeon 72・2.5・16・33.33、battle 168・5・16・28.57、boss 144・4・16・26.67、clear 66・3・16・43.64。v1.2）、パートの label・音色・vol と並び順、全パートの拍数が `bars × bpb` と同じ、打楽器が 1 周の中、`FM_PATCHES` 20 種の値が §26.3 の表と同じ、音域 24〜96（v1.1） | 単体 | `tests/logic/bgm-tracks.test.ts` |
| TC-0034-23 | 12 | 実機で 6 曲を聴き、曲名・調・テンポの印象が §12.2 の表と合い、音が外れて聞こえるところがない | 手動 | 実機（iPhone 11・PC） |

## 2. 準備

- 単体：`tests/helpers/fake-audio.ts` の `installFakeAudio(state)`。`bgm.ts` は状態を持つので、テストごとに `vi.resetModules()` のあと `await import()` し直す。`currentTime` はテストが進め、見回り（`setInterval`）は `vi.useFakeTimers()` で進める。`sceneBgm` には `tests/helpers/fixtures.ts` の GameView を渡す。
- E2E：`?debug=1` で開き、`addInitScript` で `app:sound`・`app:bgm` を時刻つきで配列に記録する。音は `localStorage['mini-wiz-game-sound'] = 'on'` を先に書いてオンにする。場面は `__wiz.writeState`・`writeSave`・`useSeed` で作り、時間は偽の時計で進める。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0034-03 | タイトル →「はじめから」→ 名前を入れて決定 →「ダンジョンへ」→ 遭遇するシードで前進 → 記録が `title`・`inn`・`dungeon`・`battle` の順。ボスの手前の状態から前進して演出が終わると `boss` |
| TC-0034-06 | HP 1 のボス戦で「たたかう」→ 偽の時計でクリア画面まで進め、さらに 5 秒進める → `bossDefeat` の `null`、演出のあとの `clear` のあとに記録が増えない（v1.1） |
| TC-0034-08 | 宿屋で記録を空にしてから、メニュー → ステータス → もどる → メニューを閉じる |
| TC-0034-13 | ボスの手前から前進 → 演出が立った時刻に `null`、1200ms 進めて `boss`。もう一度最初からやり、演出中にメッセージ欄をクリック → すぐ `boss` |
| TC-0034-15 | HP 1 のボス戦で勝つ → 記録を見る →「宿屋へ」で `inn`。所持品 50 個の状態で同じことをし、入れ替え画面で再読み込みする |
| TC-0034-16 | HP 1 の通常の敵に勝つ → 逐次表示中は `battle` 画面で記録なし → ダンジョンに移って `dungeon`。HP 1・敵が先に攻撃する状態で「たたかう」→ 宿屋で `inn` |
| TC-0034-21 | ダンジョンで記録を空にしてから、`setItem` を差し替えて前進 → ErrorPanel が出て、記録が空のまま |

## 4. 手動の手順

| 確認 ID | 手順 | 期待する結果 |
| --- | --- | --- |
| TC-0034-04 | iPhone 11 の Safari と PC の Chrome で音をオンにし、タイトル・宿屋・ダンジョン・戦闘・ボス戦・クリア画面（ボス戦とクリア画面は `?debug=1` の場面で作る）で、それぞれ 1 周より長く待つ | 1 周の終わりで音が途切れず、頭に自然につながる。ボス戦の曲は、1 周目の頭と 2 周目の頭で音が遅れたり抜けたりしない（v1.2） |
| TC-0034-18 | ダンジョンの曲が鳴っているときに遭遇する。戦闘でレベルアップする | 効果音のあいだ曲が小さくなり、終わると戻る。効果音が曲に埋もれない |
| TC-0034-23 | 6 曲を 1 周ずつ聴く | タイトルでカタコンベ（重い和音・ゆっくり）、宿屋でローエングリン（ゆっくり・高い弦）、死の島（5 拍子の揺れ・不気味）、火星（5 拍子のくり返し・激しい）、ボス戦で怒りの日（速い弦の刻みと合唱の和音）、イン・パラディス（オルガンの分散和音と歌・静か）に聞こえ、試聴ページで選んだ曲と同じ。外れた音・割れた音がない（v1.2） |
