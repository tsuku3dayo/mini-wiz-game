---
id: MWIZ-TC-0015
type: Test Case
title: 自動地図で踏破したところを確かめる
status: stable
version: 1.0
updated: 2026-10-30
sources:
  - MWIZ-US-0015（v1.0）
  - MWIZ-TST-0001（v1.0）
  - MWIZ-TD-0002（v1.0）
  - MWIZ-TD-0004（v1.0）
  - MWIZ-GUI-0004（v1.0）
  - docs/specification-ja.md (v1.2) §4.6、§4.7、§11.5、§16.2、§16.4、§22.5
verified: null
---

# TC-0015 自動地図で踏破したところを確かめる

- 対象：[US-0015](../02_requirements/MWIZ-US-0015-user-story-ja.md)（受け入れ条件 3 つ）
- 方法の分け方・置き場所の決まりは [TST-0001](MWIZ-TST-0001-test-strategy-ja.md)。

## 1. 確認の一覧

| 確認 ID | 条件 | 確かめること（期待する結果） | 方法 | 置き場所 |
| --- | --- | --- | --- | --- |
| TC-0015-01 | 1 | 踏破記録（`visited`）：出発の直後は 1F の入口だけが true。前進・後退で別のマスへ移ると、そのマスが true（遭遇したときも）。回転・壁にぶつかったときは `visited` が変わらない。5F のボスのマスへ入ると戦闘になり、そのマスは false のまま。階段で 2F へ降りて戻ると、1F の記録が残っている（降りる前と同じ）。`visitCurrent` は入力を変えず、踏破済みのマスではそのまま返す | 単体 | `tests/domain/explore.test.ts` |
| TC-0015-02 | 1 | `toAutoMapView` の `cells` は長さ 100 で、未踏破のマスは `null`、踏破済みのマスは `{ walls: { n, e, s, w }, stairs }`（隣が未踏破でもその境界の壁の有無を返す）。`stairs` は 1F の `up` が `'entrance'`、2F 以上の `up` が `'up'`、`down` が `'down'`。`player` は `{ x, y }` だけ（向きなし） | 単体 | `tests/domain/view.test.ts` |
| TC-0015-03 | 2 | `mapToShapes(map, facing)`：外枠の矩形 (0.5, 0.5)・幅 159・高さ 159。踏破済みのマスだけ 16×16 の塗り（位置 x = (i mod 10) × 16、y = floor(i ÷ 10) × 16）。壁は踏破済みのマスの壁のある辺だけ。記号は「↓」「↑」「入」と、現在地の向きの矢印「▲」（北）「▶」（東）「▼」（南）「◀」（西）。現在地のマスでは階段の記号を出さず矢印だけ。数字・ボスのマスの図形はない | 単体 | `tests/logic/map-to-shapes.test.ts` |
| TC-0015-04 | 2 | 画面の自動地図（SVG）：`viewBox="0 0 160 160"`。狭い画面では `width`・`height` が 160。広い画面（`desktop`）では正方形で 176 以上。塗りのマスの数が `debugDungeon()` の `visited` の true の数と同じ。文字は「↓」「↑」「入」「▲」「▶」「▼」「◀」だけで、数字がない。`aria-label` が「{階}F の地図。踏破済み {N} マス。」 | E2E | `e2e/dungeon.spec.ts` |
| TC-0015-05 | 3 | ゲーム API の結果（`getGame`・`move`・`stairs`・`battle` の `state`）に、`revision`・`schemaVersion`・`updatedAt`・`floors`・`walls`・`visited`・`boss`・敵の HP がない。`dungeon` のキーは `floor`・`facing`・`underfoot`・`depths`・`map` だけで、`map.cells` は現在の階の 100 個（未踏破は `null`）。`battle` のキーは `enemyKind`・`enemyName`・`isBoss`・`canHeal`・`canFlee` だけ。5F でボスのマスが視界に入っても、`depths` の `stairs` は `null` | 単体 | `tests/api/game-api.test.ts` |

## 2. 準備

- 単体：`tests/helpers/maps.ts` の `openMap(player, extra, floor)`（外周だけが壁の 10×10。上り (0,9)、下り (9,0)、5F は下りの代わりにボス (9,0)）と `constantRng`。ゲーム API は `tests/helpers/fake-storage.ts` と `SwappableRng`。結果の「ないこと」は、`JSON.stringify` した文字列とキーの一覧で確かめる。
- E2E：`?debug=1` で開き、`startAt('DUNGEON', …)` で 1F の入口（北が通路のマップ）から始め、何マスか歩いてから見る。歩いても遭遇しないように、`useSeed` で遭遇しないシードにする（`e2e/helpers.ts` に置く）。

## 3. 手順（E2E）

| 確認 ID | 手順 |
| --- | --- |
| TC-0015-04 | 入口で地図を見る（塗りが 1 マス、`aria-label` が「1F の地図。踏破済み 1 マス。」）→ ↑ で 1 マス進む → 塗りが 2 マス、現在地に「▲」→ ← で「◀」になり、塗りの数は変わらない |

## 4. 手動の手順

なし。
