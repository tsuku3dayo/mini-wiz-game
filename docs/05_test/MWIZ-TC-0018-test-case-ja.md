---
id: MWIZ-TC-0018
type: Test Case
title: 敵と遭遇する
status: stable
version: 1.2
updated: 2026-11-12
sources:
  - MWIZ-US-0018（v1.1）
  - MWIZ-TST-0001（v1.2）
  - MWIZ-TD-0002（v1.9）
  - MWIZ-TD-0003（v1.7）
  - MWIZ-TD-0004（v1.8）
  - docs/specification-ja.md (v1.19) §4.3、§5.1、§6、§11.8、§16.1、§16.2、§16.4、§23
verified: null
---

# TC-0018 敵と遭遇する

- 対象：[US-0018](../02_requirements/MWIZ-US-0018-user-story-ja.md)（受け入れ条件 7 つ。v1.2 で 4 つ目に遭遇の入力止めが入り、それより後の番号が 1 つずつずれた）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0018-01 | 1 | 何もないマスへ前進・後退したとき：`SequenceRng([20, n])` で遭遇（場所 `BATTLE`、`records.battles` が +1、メッセージ「{敵の名前}が あらわれた！」normal）。`SequenceRng([21])` で遭遇せず、乱数を 1 個だけ使う（`assertExhausted()`）。例：3F で [20, 31] → スケルトン | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-02 | 1 | 回転・壁にぶつかる・階段で着く・宿屋へ戻る・上り階段／下り階段／入口のマスへ歩いて入る、では乱数を引かず（呼ぶと例外になる Rng）、遭遇しない | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-03 | 2 | `SeededRng` の固定シードで遭遇判定を 10,000 回すると、遭遇の割合が 18%〜22%。各階で遭遇した敵の割合が出現表（1F スライム 70・ゴブリン 30、2F スライム 30・ゴブリン 50・スケルトン 20、3F ゴブリン 30・スケルトン 50・オーク 20、4F スケルトン 30・オーク 50・ダークナイト 20、5F オーク 40・ダークナイト 60）の ±2.5 ポイントに入る | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-04 | 2 | `pickEnemy` の境目：1F は 70 → スライム・71 → ゴブリン。2F〜4F は 30・31・80・81 の境目、5F は 40 → オークロード・41 → ダークナイト | 単体 | `tests/domain/explore.test.ts` |
| TC-0018-05 | 3 | `arrival` の遭遇の判定：前の状態がない、または前の場所が BATTLE でなく、新しい場所が BATTLE のとき真。BATTLE → BATTLE（ターンの続き）・DUNGEON → DUNGEON では偽 | 単体 | `tests/logic/arrival.test.ts` |
| TC-0018-06 | 3 | 画面で：メッセージ欄に行がある状態で前進して遭遇すると、それまでの行が消え、メッセージ欄が「スライムが あらわれた！」の 1 行だけになり、戦闘の画面（`body[data-screen="battle"]`）になる | E2E | `e2e/battle.spec.ts` |
| TC-0018-07 | 5 | `ENEMIES` の 6 種が仕様書 §6.1 の表のとおり：スライム（HP 12・攻 4・防 2・速 3・経験値 4）、ゴブリン（18・6・3・6・10）、スケルトン（26・9・6・5・18）、オークロード（48・16・10・5・30。種類は `orc`。v1.1 で表示名を「オーク」から変えた）、ダークナイト（70・24・16・10・50）、暗黒のネクロマンサー（260・34・20・14・1000）。出現表に出る階が表のとおり（スライム 1F・2F、ゴブリン 1F〜3F、スケルトン 2F〜4F、オークロード 3F〜5F、ダークナイト 4F・5F、ネクロマンサーはどの出現表にもない）。各階の出現表の合計が 100 | 単体 | `tests/domain/constants.test.ts` |
| TC-0018-08 | 6 | `SeededRng(1)` の `int(1,100)` を 10 回引くと 63, 1, 53, 99, 97, 29, 62, 73, 43, 100 | 単体 | `tests/domain/rng.test.ts` |
| TC-0018-09 | 7 | `chance(0.1)` は、`int` が 10 を返すと真、11 を返すと偽（`SequenceRng`）。`chance` を 1 回呼ぶと乱数を 1 個だけ使う | 単体 | `tests/domain/rng.test.ts` |
| TC-0018-10 | 4 | `ENCOUNTER_LOCK_MS` が `{ normal: 510, boss: 2906 }` で、`normal` が `SFX_MS.encounter`、`boss` が `EFFECT_MS.bossAppear` と同じ。`encounterLockMs(false)` が 510、`encounterLockMs(true)` が 2906（v1.2。仕様書 v1.17） | 単体 | `tests/audio/sound.test.ts` |
| TC-0018-11 | 4 | 通常の敵（v1.2）：前進で遭遇した時刻から 509ms までは、`body[data-busy="true"]`、戦闘のボタンの箱が `aria-disabled="true"`。その間に「たたかう」を押し（`desktop` はクリックと Enter、`pixel7`・`small` はタップ）、メッセージ欄をクリック（タップ）しても、ターンが進まない（メッセージ欄が「スライムが あらわれた！」の 1 行のまま、`revision` が変わらない）。510ms で `data-busy` が `true` でなくなり、ボタンが押せる。そのあと「たたかう」を 1 回押すと、ターンが 1 回だけ進む（止めている間に押した分は決まらない） | E2E | `e2e/battle.spec.ts` |
| TC-0018-12 | 4 | ボス（v1.2）：ボスのマスに入った時刻から 2905ms までは、メッセージ欄のクリック（タップ）、`desktop` の Enter・Space をしても、`#effect-layer` の `data-effect="bossAppear"` が残り、`body[data-busy="true"]` のまま、戦闘のボタンが押せない（ターンが進まない）。2906ms で演出が終わり、ボタンが押せる | E2E | `e2e/effects.spec.ts` |
| TC-0018-13 | 4 | 音がオフ（既定）とオン、動きを減らす設定（`page.emulateMedia({ reducedMotion: 'reduce' })`）で、TC-0018-11 の 509ms・510ms の結果が同じ。動きを減らす設定のボスでも、2905ms まで押せず 2906ms で押せる（v1.2） | E2E | `e2e/battle.spec.ts` |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap(player, extra, floor)`（上り (0,9)、下り (9,0)）と `dungeonState`。乱数の列は `SequenceRng`、使わないことは呼ぶと例外になる Rng で確かめる。統計は `SeededRng` の固定シード。
- E2E：`?debug=1` で開き、`startAt('DUNGEON', …)` で 1F の何もないマス（正面が壁のマスの隣）から始める。次の前進で遭遇してスライムが出るシードを `useSeed` で使う（`e2e/helpers.ts` に置く）。ボスは 5F のボスのマスの手前（`dungeonMap({ x: 9, y: 1, floor: 5 })`）から前進する。
- 遭遇の入力止め（v1.2）：時間は偽の時計で進める。遭遇した時刻は、前進の応答が返った時刻（`setDelay` を使わないので押した時刻と同じ）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0018-06 | 正面が壁の向きで ↑ →「かべだ」が出る → → で通路の向きにする → `useSeed` → ↑ → メッセージ欄の行が「スライムが あらわれた！」の 1 つだけ（「かべだ」がない）。`body[data-screen]` が `battle` |
| TC-0018-11 | 偽の時計（`install` → `pauseAt`）で、遭遇するシードにして ↑（タッチは前進のボタン）→ 戦闘の画面になったら、時計を進めずに「たたかう」とメッセージ欄を押す → `runFor(509)` → 行の数・`revision`・`data-busy`・`aria-disabled` を見る → `runFor(1)` → `data-busy` が `false`、`aria-disabled` がない →「たたかう」→ 表示が終わるまで進めて、行がターン 1 回分だけ増えている |
| TC-0018-12 | 5F のボスの手前で前進 → 演出が立ったら、メッセージ欄をクリック（`desktop` は Enter・Space も）→ `runFor(2905)` の間に何度か同じことをする → `data-effect` が `bossAppear` のまま →「たたかう」を押しても行が増えない → `runFor(1)` → `data-effect` がなく、ボタンが押せる |
| TC-0018-13 | 音をオンにしてから（タイトルの「おと」）TC-0018-11 の手順。`emulateMedia({ reducedMotion: 'reduce' })` で TC-0018-11 と TC-0018-12 の手順（クリックのところは同じ） |

## 4. 手動の手順

なし。
