---
id: MWIZ-TD-0002
type: Technical Design
title: 詳細設計 ルール・表示の計算・ゲーム API・保存
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-TD-0001（v1.0）
  - MWIZ-SA-0001（v1.0）
  - MWIZ-ADR-0004（v1.0）
  - MWIZ-ADR-0006（v1.0）
  - MWIZ-ADR-0007（v1.0）
  - docs/specification-ja.md (v1.2) §2〜§10、§20.3、§21〜§24
verified: null
---

# TD-0002 ルール・表示の計算・ゲーム API・保存

ルールの中身（式・表・乱数を引く順・文言）は仕様書 §2〜§10 と §23・§24 を正とする。ここでは、ファイルの分け方・関数の受け持ち・作る順・テストのしかたを決める。

## 1. ルール（`src/domain/`）

### 1.1 ファイルと受け持ち

| ファイル | 受け持つ関数・定数（仕様書 §24） | 仕様書 |
| --- | --- | --- |
| `rng.ts` | `Rng`・`SeededRng`（mulberry32）・`SequenceRng`・`SwappableRng` | §23 |
| `constants.ts` | 初期能力値・成長・回避・逃走・ヒール・遭遇率・敵 6 種（`ENEMIES`）・出現表 | §6、§15.1 |
| `errors.ts` | `DomainError` と派生（`ValidationError`・`InvalidStateError`・`ConflictError` など。`code`・`status`） | §24.1 |
| `game-state.ts` | 型（`GameStateData`・`Location`・`StepResult` など）、`assertLocation`、読み込み時の移行、セーブとの変換 | §10、§21.4、§24.3 |
| `character.ts` | 名前の正規化と検査、作成、経験値とレベルアップ、やすむ、周回 | §2、§7.2、§9.3 |
| `dungeon.ts` | 1 階の壁、最短歩数、違反の列挙、移動・回転、座標の補助 | §3.2、§3.3、§4.1 |
| `floors.ts` | 5 階層の生成、1 階分の不変条件 | §3.4、§3.5 |
| `explore.ts` | 出発、移動＋踏破記録＋遭遇判定、階段、帰還、敵の選択 | §4 |
| `view.ts` | 視界（`toFirstPersonView`）・地図（`toAutoMapView`）・階段の種類 | §4.7、§4.10 |
| `battle.ts` | ダメージ・行動順・回避・逃走・1 ターンの解決・敗北・`toBattleView` | §5 |
| `heal.ts` | ヒール（戦闘・ダンジョン共通） | §7.1 |
| `items.ts` | 装備のマスタ 32 種・レアリティ・補正値の範囲・`conformItem` | §8.2、§8.3 |
| `loot.ts` | ドロップの抽選・所持品への追加・入れ替え・ドロップの行 | §8.4、§8.5 |
| `equipment.ts` | 実効値・付け替え・はずす・捨てる | §8.5 |
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

## 2. 表示の計算（`src/logic/`）

仕様書 §20.3 の表のとおり。画面層から呼ばれる純粋関数。

| ファイル | 決めること（v1.2 で足したもの） |
| --- | --- |
| `message-plan.ts` | 演出の長さ・遷移の保留の件数・動きを減らす設定のときのまとめ方。**持つ行の数 `MAX_LINES = 7`**（v1.2。画面に出す行数はメッセージ欄が決める。TD-0003 §3） |
| `menu-model.ts` | カーソルの初めの位置・端で止まる・Tab の閉じ込め・項目が減ったとき |
| `view-to-segments.ts`・`map-to-shapes.ts`・`describe-view.ts` | 疑似3D の線分・地図の図形・説明文（座標は viewBox の値。表示の大きさとは関係しない） |
| `item-text.ts`・`sort-items.ts`・`stat-diff.ts` | 装備の文言・並び順・変化 |
| `arrival.ts`・`low-hp.ts` | 遭遇の判定・足元の案内、体力わずか・HP の警告 |
| `name.ts`・`version.ts`・`enemy-image.ts` | 名前の規則、版の表記、敵の絵の URL |
| `bgm-scene.ts`・`bgm-notation.ts`・`bgm-tracks.ts` | TD-0005 |

テスト：`tests/logic/`。入力と出力の表で確かめる（DOM を使わない）。

## 3. ゲーム API（`src/api/`）

### 3.1 作り

```ts
export function createGameApi(deps: { storage: Storage; rng: Rng; now: () => string; delayMs?: () => number }): GameApi
```

- 操作は仕様書 §22.2 の 20 個。どれも `run(step)` を呼ぶだけにする：

```
run(step)
  1. repository.findGame()      … なければ 404。読み込み時の移行（§21.4）
  2. result = step(state)        … domain の関数。DomainError はここで投げられる
  3. next.location === 'CLEARED' かつ前が CLEARED でない
       → repository.writeGameAndSave(next, revision, toSaveData(next))（まとめて書く。§21.6）
     それ以外 → repository.updateGame(next, revision)（revision を読み直し、違えば ConflictError。§21.5）
  4. return { state: toGameView(next), messages: result.messages }
  外側：DomainError → GameError、保存の失敗 → storage_error、ほか → internal_error（TD-0001 §4）
```

- `getGame`・`getSave`・`startGame`・`quitGame`・`load`・`save` は `run` を通らない専用の流れ（仕様書 §22.2 の表）。
- テスト用の応答の遅れ（`__wiz.setDelay`）は、`deps.delayMs` を `await` で待つだけにする（`?debug=1` のときだけ `main.ts` が渡す）。

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
| `migrateStorage()` | 版（`schema`）を確かめる。読めない値は「なし」とする |

- 例外を外に出さない（戻り値で失敗を返す。TD-0001 §4）。
- `repository.ts` は、この戻り値の失敗を `storage_error` に変える。

## 5. 作る順（06 作業計画の目安）

1. `rng`・`constants`・`errors`・`game-state` の型
2. `character`・`heal`・`records`
3. `dungeon`・`floors`・`explore`・`view`
4. `battle`
5. `items`・`loot`・`equipment`
6. `storage`・`repository`・`game-view`・`validate`・`game-api`
7. `logic/`（画面を作る WS の直前に、使うものから）

どの段階でも単体テストを先に書く（テストの名前の先頭に確認 ID）。
