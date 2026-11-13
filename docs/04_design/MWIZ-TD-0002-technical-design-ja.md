---
id: MWIZ-TD-0002
type: Technical Design
title: 詳細設計 ルール・表示の計算・ゲーム API・保存
status: stable
version: 1.10
updated: 2026-11-13
sources:
  - MWIZ-TD-0001（v1.2）
  - MWIZ-SA-0001（v1.1）
  - MWIZ-ADR-0004（v1.0）
  - MWIZ-ADR-0006（v1.0）
  - MWIZ-ADR-0007（v1.1）
  - docs/specification-ja.md (v1.21) §2〜§10、§20.3、§21〜§24
verified: null
---

# TD-0002 ルール・表示の計算・ゲーム API・保存

ルールの中身（式・表・乱数を引く順・文言）は仕様書 §2〜§10 と §23・§24 を正とする。ここでは、ファイルの分け方・関数の受け持ち・作る順・テストのしかたを決める。

## 1. ルール（`src/domain/`）

### 1.1 ファイルと受け持ち

| ファイル | 受け持つ関数・定数（仕様書 §24） | 仕様書 |
| --- | --- | --- |
| `rng.ts` | `Rng`・`SeededRng`（mulberry32）・`SequenceRng`・`SwappableRng` | §23 |
| `constants.ts` | 初期能力値・成長・回避（v1.8 から `EVASION = { min: 0, max: 90 }`）・逃走・ヒール・遭遇率・敵 6 種（`ENEMIES`。`orc` の表示名は「オークロード」）・出現表 | §6、§15.1 |
| `errors.ts` | `DomainError` と派生（`ValidationError`・`InvalidStateError`・`ConflictError` など。`code`・`status`） | §24.1 |
| `game-state.ts` | 型（`GameStateData`・`Location`・`StepResult`・`SaveSlot` など）、`SAVE_SLOTS`、`assertLocation`、読み込み時の移行（版 6 の `saveSlot`、版 7・セーブの版 4 のアクセの ID の付け替え（v1.10））、セーブとの変換 | §10、§21.4、§24.3 |
| `character.ts` | 名前の正規化と検査、作成、経験値（`gainExp`）とレベルアップ（`levelUp`）、やすむ（`rest(state, rng)`）、周回 | §2、§7.2、§9.3 |
| `dungeon.ts` | 1 階の壁、最短歩数、違反の列挙、移動・回転、座標の補助 | §3.2、§3.3、§4.1 |
| `floors.ts` | 5 階層の生成、1 階分の不変条件 | §3.4、§3.5 |
| `explore.ts` | 出発、移動＋踏破記録＋遭遇判定、階段、帰還、敵の選択 | §4 |
| `view.ts` | 視界（`toFirstPersonView`）・地図（`toAutoMapView`）・階段の種類 | §4.7、§4.10 |
| `battle.ts` | ダメージ・行動順・回避（`evadeChance(受ける側のかいひ, 攻撃側の速)`。v1.9）・逃走・1 ターンの解決・敗北・`toBattleView` | §5 |
| `heal.ts` | ヒール（戦闘・ダンジョン共通） | §7.1 |
| `items.ts` | 装備のマスタ 32 種（たては `stats: ['evasion']`。v1.10 から種類ごとに出るレアリティ `rarities` と範囲 `ranges` を持つ）・`StatKey`（`evasion` を含む 6 つ）・レアリティ・補正値の範囲・`conformItem` | §8.2、§8.3 |
| `loot.ts` | ドロップの抽選・所持品への追加・入れ替え・ドロップの行 | §8.4、§8.5 |
| `equipment.ts` | 実効値（`evasion` ＝ 素早さの実効値 ＋ 装備の かいひ の補正。v1.9。v1.10 から たて・ウィンドブーツ・ソロモンのゆびわ）・付け替え・はずす・捨てる | §8.5 |
| `records.ts` | 実績の数え方と補正 | §9.4 |

### 1.2 決まり

- すべて **純粋関数**。入力を変えず、新しいオブジェクトを返す（スプレッドで作る。深いコピーの道具は使わない）。
- 状態を進める関数は `StepResult { state, messages }`（戦闘は `TurnResult`）を返す。メッセージの文はこの層で作る（ゲーム API が正。ADR-0004）。
- 乱数は引数の `Rng` からだけ引く。**引く順と個数は仕様書のとおり**（§5.7・§8.4 など）。順を変えると同じシードで同じ結果にならない。
- エラーは `DomainError` の派生だけを投げる。文言は仕様書のとおり。

### 1.3 テスト（`tests/domain/`）

- 入力を凍らせて（`deepFreeze`。`tests/helpers/` に置く）呼び、入力が変わらないことを確かめる。
- 乱数は `SequenceRng`（決まった値の列）で境界を、`SeededRng` で生成物の不変条件（全マス到達・階段の位置など）を確かめる。
- 仕様書 §16.1〜§16.3 の受け入れ基準の数値の例（「経験値 0 に 72 を加えると Lv3」など）は、そのまま単体テストにする。

### 1.4 仕様書で決まっていなかったこと（v1.1。TASK-0004 で決めた）

- `normalizeInventory` で、装備中の枠に **部位の合わない個体**（例：よろいの枠に `weapon1`）があったら、形の違う値として黙って捨てる（その枠は空にする）。ID は `nextId` の計算に含める。

### 1.5 仕様書で決まっていなかったこと（v1.4。TASK-0008 で決めた）

- `move`・`stairs` の引数が違うときの `details[0].message` は、v1.0 の DTO（class-validator の `IsIn`）の既定の文と同じにする：`action must be one of the following values: forward, backward, turnLeft, turnRight`、`direction must be one of the following values: down, up`（`api/validate.ts`）。
- テスト用の道具 `tests/helpers/maps.ts`：`dungeonState(dungeon, overrides)`（DUNGEON の状態）、`constantRng(value)`（いつも同じ値。範囲の外なら端に寄せる。100 なら遭遇しない）、`noRng()`（引くと例外）、`addWall(d, floor, x, y, dir)`（両側から壁を足す）。
- （v1.5。TASK-0010）`battleState(kind, enemyHp, overrides, isBoss)`（戦闘中の状態）、`tests/helpers/rng.ts` の `recordingRng(inner)`（引いた乱数の `int(a, b)` の引数と値を記録する）。
- （v1.6。TASK-0014）`equip`・`discard` の `itemId`、`lootTake` の `discardId` が整数でないときは `{field} must be an integer number`、1 未満のときは `{field} must not be less than 1`（v1.0 の DTO の `IsInt`・`Min(1)` の既定の文）。`unequip` の `slot` は `IsIn` と同じ文。
- （v1.6。TASK-0014）自動プレイヤー `tests/helpers/autoplayer.ts` の `play(api, name, { laps, resume })`：`resume` なら新しく始めず、今のプレイ中の状態から続ける（2 周目を確かめるため）。装備の強さは段階 → 補正値で比べる。上り階段ともう一方（下り階段。5F は上り階段の対角）の間を行き来して育つ。

### 1.7 仕様書 v1.14 で変えること（v1.8。WS-0019）

かいひ・回避の行は、v1.9（仕様書 v1.16）の §1.8 で替えた。

章の番号を変えないよう、ここに足した。

| 項目 | 作り |
| --- | --- |
| かいひ | `StatKey` に `'evasion'` を足す（`domain/items.ts`・`api/types.ts`）。キャラクターの保存の形（`Character`）には足さない（基礎値はいつも 0）。`effectiveStats(state)` は `evasion: 0 + bonus.evasion` を返す。`equipmentBonus` は 6 つの能力を 0 から足す。たて 8 種の `stats` を `['evasion']` にする（名前・幅・段階は同じ） |
| 回避 | `evadeChance(defenderSpeed, attackerSpeed, defenderEvasion)` = `clamp(defenderSpeed − attackerSpeed + defenderEvasion, EVASION.min, EVASION.max)`（v1.8。v1.9 で下の表の形に替えた）。`Combatant` に `evasion` を足す。プレイヤーは `effectiveStats`、敵は `{ ...ENEMIES[kind], evasion: 0 }`。回避の乱数 `int(1,100)` は回避率 0 でも引く（いまの `attack` の作りのまま） |
| 経験値とレベルアップ | `applyExp` を 2 つに分ける：`gainExp(state, gained)`（`exp` を足すだけ。乱数なし・メッセージなし）と `levelUp(state, rng)`（たまった `exp` で繰り返し上げる。成長の乱数の順・メッセージは v1.13 の `applyExp` と同じ）。勝利（`battle.ts` の通常の敵・ボス）は `gainExp` だけを呼び、すぐ `rollDrop` へ進む |
| やすむ | `rest(state, rng)`：① HP・MP を実効値の最大に ② メッセージ「HP と MP が かいふくした」③ `levelUp(state, rng)` のメッセージを続ける。ゲーム API の `rest` は `run(s => rest(s, rng))` |
| EXP の表示 | `toGameView` の `expToNext = max(0, nextLevelExp − exp)`。0 なら画面は「（やどで レベルアップ）」 |
| 最後に使ったスロット | `GameStateData.saveSlot: SaveSlot \| null`。`createCharacter` は null。`fromSaveData(save, slot)` は `saveSlot = slot`。`migrateGameState` は版 6 で 1〜3 ならその値、それ以外は null（版 5 以下は null。移し替えで 1 を書き足したものは版 5 のまま `saveSlot: 1` を持つので、版 5 でも 1〜3 の値があれば採る）。`GAME_SCHEMA_VERSION = 6` |
| GameView | `character.evasion`・`base.evasion`（0）・`bonus.evasion`、`saveSlot`、`clear.autoSaved = 保存の版（移行前）≥ 3 かつ saveSlot が null でない`（操作の応答も同じ式） |

### 1.8 仕様書 v1.16 で変えること（v1.9。WS-0020）

| 項目 | 作り |
| --- | --- |
| かいひ | `effectiveStats(state)` の `evasion` ＝ `speed`（実効値）＋ たての補正（`equipmentBonus` の `evasion`）。`equipmentBonus` はいまのまま（`evasion` にはたての補正だけが入る）。保存の形には足さない |
| 回避 | `evadeChance(defenderEvasion, attackerSpeed)` ＝ `clamp(defenderEvasion − attackerSpeed, EVASION.min, EVASION.max)`。`attack` は `evadeChance(defender.evasion, attacker.speed)`。プレイヤーの `Combatant` は `effectiveStats` の `evasion`、敵は `{ ...ENEMIES[kind], evasion: ENEMIES[kind].speed }`。乱数を引く順・数はいまと同じ（計算の結果も v1.8 と同じ） |
| GameView | `character.evasion` ＝ `effectiveStats` の `evasion`。`base.evasion` ＝ 素早さの基礎値（`state.speed`）。`bonus.evasion` ＝ 素早さの補正 ＋ たての補正（`base + bonus = 実効値` がほかの能力と同じに成り立つ） |
| 装備画面の変化 | `logic/stat-diff.ts` の `statDiff`：候補・今の枠の個体の `stats` に `speed` があれば、`evasion` にも同じ値を足し引きする（ウィンドブーツで すばやさ と かいひ の 2 行が変わる）。たて（`evasion`）は かいひ の行だけ |

### 1.9 仕様書 v1.21 で変えること（v1.10。WS-0024）

| 項目 | 作り |
| --- | --- |
| 敵 | `constants.ts` の `ENEMIES` を仕様書 §6.1 の表に（ボス以外の経験値は 2 倍） |
| 装備のマスタ | `ItemMaster` の `min`・`max` をやめ、`rarities: readonly Rarity[]`（低い方, 高い方。段階 8 は LG だけ）と `ranges: readonly [lo, hi][]`（`rarities` と同じ順）を持つ。`rarities` の既定は段階の表（ファイルの中だけの定数）から作り、ガードリング（`accessory3`）だけ `['R', 'SR']` を渡す。`RARITY_MULTIPLIER`・`RARITY_BY_TIER` は書き出さない（使うところをなくす）。アクセの並び・能力は §8.2 の表（ウィンドブーツは `['evasion']`、ソロモンのゆびわは `['attack', 'defense', 'evasion']`） |
| 補正値 | `valueRange(itemId, rarity)` ＝ その種類の `ranges` のうち `rarity` の位置の範囲（出ないレアリティなら、最も近い出るものの範囲）。`rollDrop` は部位・段階で `itemId` を決めてから、`ITEMS[itemId].rarities` でレアリティを決め、`rng.int(lo, hi)` を補正値にする。乱数を引く順・数は変わらない |
| 古いデータの補正 | `conformItem`：レアリティを最も近い出るもの（同じ距離なら低い方）に替え、補正値は換算せずに範囲に切り詰める |
| 保存の版 | `GAME_SCHEMA_VERSION = 7`、`SAVE_SCHEMA_VERSION = 4`。`remapAccessoryIds(raw)`：保存値の所持品（形は調べない）の装備中・所持品・入れ替え待ちの `itemId` を、`accessory1→3`・`2→4`・`3→5`・`4→1`・`5→2` に付け替えた写しを返す。`migrateGameState` は版 6 以下、`migrateSave` は版 3 以下のときに、`normalizeInventory` の前に通す。`migrateSave` は版 4 を受け付ける |
| 表示 | 補正が 3 つの種類（ソロモンのゆびわ）も、`bonusTexts`・`itemText`・`itemSpoken` は `stats` の数だけ並べるいまの作りのまま。`statDiff` の「`speed` があれば `evasion` にも足す」は、すばやさを上げる種類がなくなっても残す（足す値が 0 になるだけで、動きは変わらない） |
| テストの道具 | `tests/api/game-api.test.ts` の `storedGame`・`storedSave`、`e2e/helpers.ts` の保存の版の既定を、`GAME_SCHEMA_VERSION`・`SAVE_SCHEMA_VERSION`（7・4）にする（古い版で書くと、テストの装備まで付け替えられる） |

## 2. 表示の計算（`src/logic/`）

仕様書 §20.3 の表のとおり。画面層から呼ばれる純粋関数。

| ファイル | 決めること（v1.2 で足したもの） |
| --- | --- |
| `message-plan.ts` | 演出の長さ・遷移の保留の件数・動きを減らす設定のときのまとめ方。**持つ行の数 `MAX_LINES = 7`**（v1.2。画面に出す行数はメッセージ欄が決める。TD-0003 §3） |
| `menu-model.ts` | カーソルの初めの位置・端で止まる・Tab の閉じ込め・項目が減ったとき |
| `view-to-segments.ts`・`map-to-shapes.ts`・`describe-view.ts` | 疑似3D の線分・地図の図形・説明文（座標は viewBox の値。表示の大きさとは関係しない） |
| `item-text.ts`・`sort-items.ts`・`stat-diff.ts` | 装備の文言・並び順・変化（v1.8：`STAT_NAMES` に `evasion: 'かいひ'`、`STAT_ORDER` を こうげき → ぼうぎょ → すばやさ → かいひ → さいだいHP → さいだいMP に） |
| `arrival.ts`・`low-hp.ts` | 遭遇の判定・足元の案内、体力わずか・HP の警告 |
| `name.ts`・`version.ts`・`enemy-image.ts` | 名前の規則、版の表記、敵の絵の URL |
| `bgm-scene.ts`・`bgm-notation.ts`・`bgm-tracks.ts` | TD-0005 |
| `save-slots.ts`（v1.8。仕様書 v1.14） | スロットの一覧の行の文（`slotLabel(slot, summary)` →「スロット1　ゆうしゃ Lv12」／「スロット2　－ なし －」）と初めのカーソル（`latestSlot(slots)`：`savedAt` が最も新しいスロット、`defaultSaveSlot(slots, saveSlot)`：最後に使ったスロット → 最初の空き → 1）。メニューの index は「もどる」の分 +1 して画面が使う |
| `credits.ts`（v1.7。仕様書 v1.12） | クレジットの組 `CREDITS: readonly { role: string; name: string }[]`（仕様書 §11.5 の表のとおり 6 組。`Object.freeze`）。画面（TD-0004 §10）はこれを並べるだけ |

テスト：`tests/logic/`。入力と出力の表で確かめる（DOM を使わない）。

## 3. ゲーム API（`src/api/`）

### 3.1 作り

```ts
export function createGameApi(deps: { store: KeyValueStore; rng: Rng; now: () => string; delay?: () => Promise<void> }): GameApi
```

- `store` の名前と形は仕様書 §22.1・§21.7 のとおり（v1.2 で `storage: Storage` から直した）。型 `KeyValueStore` は `api/repository.ts` に置く。`platform/storage.ts` は同じ形のものを作り、`main.ts` が渡す（層の決まりで、api と platform は互いを import しないため）。
- 操作は、それを使う TASK で足す（TASK-0005 は getGame・getSave・startGame・quitGame・rest・save・load）。応答の遅れ `delay` は `__wiz.setDelay` と一緒に TASK-0006 で足した（v1.3。ゲーム API の中ではタイマーを使わない（仕様書 §19.4）ので、`delayMs: () => number` ではなく「待つ関数」を受け取る）。GameView の `dungeon` は、視界と地図（`view.ts`）を作る TASK-0008 までは null。

- 操作は仕様書 §22.2 の 20 個（v1.8 で `getSave()` を `getSaves()` に、`save()`・`load()` に `{ slot }` を足した）。どれも `run(step)` を呼ぶだけにする：

```
run(step)
  1. repository.findGame()      … なければ 404。読み込み時の移行（§21.4）
  2. result = step(state)        … domain の関数。DomainError はここで投げられる
  3. next.location === 'CLEARED' かつ前が CLEARED でない
       → slot = next.saveSlot ?? 最初の空き（repository.listSaves()。1→3）
         slot があれば next = { ...next, saveSlot: slot } にして
         repository.writeGameAndSave(next, revision, slot, toSaveData(next))（まとめて書く。§21.6）
         slot がなければ repository.updateGame(next, revision)（自動セーブしない。v1.8）
     それ以外 → repository.updateGame(next, revision)（revision を読み直し、違えば ConflictError。§21.5）
  4. return { state: toGameView(next), messages: result.messages }
  外側：DomainError → GameError、保存の失敗 → storage_error、ほか → internal_error（TD-0001 §4）
```

- `getGame`・`getSaves`・`startGame`・`quitGame`・`load`・`save` は `run` を通らない専用の流れ（仕様書 §22.2 の表）。
- （v1.8）`save({ slot })`：`slot` を検査（整数 1〜3。違えば 400、`details[0].message` は `slot must be one of the following values: 1, 2, 3`）→ `findGame`（なければ 404）→ `assertLocation(INN)` → `next = { ...state, saveSlot: slot }` → `writeGameAndSave(next, revision, slot, toSaveData(next))`（revision を確かめる。プレイ中の状態も書くので revision が 1 増える）→ メッセージ「スロット{slot}に セーブしました」。`load({ slot })`：検査 → `findSave(slot)`（なければ 404 save_not_found）→ `fromSaveData(migrateSave(...), slot)` で置き換える。`getSaves()`：`listSaves()` の 3 つを `{ slot, name, level, savedAt }` か null にする
- テスト用の応答の遅れ（`__wiz.setDelay`）は、操作の中身を動かしたあと `deps.delay()` を待ってから結果を返すだけにする（`?debug=1` のときだけ `main.ts` が渡す）。

### 3.2 GameView（`game-view.ts`）

- 仕様書 §22.4・§22.5 のとおり。見せない情報（未踏破のマスの壁・ボスの位置・敵の HP・revision）は入れない。
- 画面層はこれ以外を受け取らない（ADR-0004）。

### 3.3 テスト（`tests/api/`）

- `tests/helpers/fake-storage.ts`（指定したキーで書き込みを失敗させられる）と `SwappableRng`（既定 `SeededRng(1)`）を渡す。
- 確かめること：操作の結果、保存の中身、エラーの形、楽観ロック、自動セーブ（途中で失敗したら両方戻る）、読み込み時の移行、保存できないとき。
- 通しプレイ：`tests/helpers/autoplayer.ts`（仕様書 §29.2）でシード 2026 のボス撃破・装備を拾ってクリア・2 周。時間切れ 120 秒。

## 4. 保存（`src/platform/storage.ts`）

仕様書 §21 のとおり。

| 関数 | 受け持ち |
| --- | --- |
| `read(name)` / `write(name, value)` / `remove(name)` | `localStorage` を `try/catch` で包み、成否を返す。キーは `mini-wiz-game-<name>`（ADR-0007） |
| `writeAll(entries)` | 複数のキーをまとめて書く。途中で失敗したら、書いた分を元の値に戻して失敗を返す（ADR-0006） |
| `migrateStorage()` | 版（`schema`）を確かめる。読めない値は「なし」とする。v1.8（仕様書 v1.14）：版 1 なら `save` を `save-1` に写し、`game` があって `saveSlot` を持たなければ `saveSlot: 1` を足す（`save` があったときだけ）。`writeAll` で書けたら `save` を消して版 2 を書く。書けなければ版 1 のまま（次の起動でやり直す） |

- 例外を外に出さない（戻り値で失敗を返す。TD-0001 §4）。
- `repository.ts` は、この戻り値の失敗を `storage_error` に変える。
- （v1.8）セーブのキーは `save-1`・`save-2`・`save-3`（`mini-wiz-game-save-n`）。`repository.ts` の `findSave(slot)`・`listSaves()`・`writeGameAndSave(state, revision, slot, save)`。`writeSave` はなくす

## 5. 作る順（06 作業計画の目安）

1. `rng`・`constants`・`errors`・`game-state` の型
2. `character`・`heal`・`records`（`rest` と `normalizeInventory` が使うので、`items` のマスタ・`conformItem`、`equipment` の `effectiveStats`、`loot` の `emptyInventory` もここで作る。v1.1）
3. `dungeon`・`floors`・`explore`・`view`（移動で遭遇すると戦闘が始まるので、`battle` の `startBattle` もここで作る。v1.4）
4. `battle`・`heal`。勝利の処理は「成長 → ドロップ」の順に乱数を引く（v1.8 からは成長がなく、すぐドロップ）ので、`loot` の `DROPS`・`rollDrop`・`addItem`・`dropMessage`・`applyDrop` と、ボスに勝ったときの処理（§9.1。CLEARED・実績・クリアの行）もここで作る（v1.5。TASK-0010。確かめは予定どおり TASK-0012・0014）
5. `items`・`loot`・`equipment`
6. `storage`・`repository`・`game-view`・`validate`・`game-api`
7. `logic/`（画面を作る WS の直前に、使うものから）

どの段階でも単体テストを先に書く（テストの名前の先頭に確認 ID）。
