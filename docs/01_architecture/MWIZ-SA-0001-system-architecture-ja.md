---
id: MWIZ-SA-0001
type: System Architecture
title: WIZ システム構成
status: review
version: 1.0
updated: 2026-10-26
sources:
  - MWIZ-PB-0001（v1.0）
  - docs/specification-ja.md (v1.1) §1.3、§1.4、§11、§14、§17〜§22、§27〜§30
  - mini-blockbreaking-game doc/01_architecture/MBRK-SA-0001（v1.0）
verified: null
---

# システム構成（system-architecture）

技術の版と道具は [MWIZ-TS-0001](MWIZ-TS-0001-technology-stack-ja.md)、判断の理由は ADR（MWIZ-ADR-0001〜0012）を参照。実装の細かい決まり（ファイル名・関数・設定の値）は仕様書 v1.1 第 2 部にあり、04 詳細設計で確定する。

## 1. 全体像

**サーバーを持たない、ブラウザだけで動く PWA**（静的サイト）。ゲームのルール・保存・効果音・BGM は、すべて端末の中で処理し、外部への通信はない（[ADR-0001](MWIZ-ADR-0001-architecture-decision-ja.md)）。構成は `mini-blockbreaking-game` と同じ（[ADR-0002](MWIZ-ADR-0002-architecture-decision-ja.md)）。

元の WIZ の「API サーバーが正、画面は表示するだけ」という分け方は、ブラウザの中の **ゲーム API** として保つ（[ADR-0004](MWIZ-ADR-0004-architecture-decision-ja.md)）。

```
GitHub (tsuku3dayo/mini-wiz-game)
  │ main への push
  ▼
GitHub Actions ──lint / 整合性 / 単体テスト / build / 成果物の検査 / E2E が通ったら──▶ GitHub Pages（静的配信）
                                                                                     │ https://tsuku3dayo.github.io/mini-wiz-game/
                                                                                     ▼
┌──────────────────────────────────── ブラウザ / ホーム画面アプリ ────────────────────────────────────┐
│ index.html + public/boot.js（起動の見張り・復旧）                                                     │
│                                                                                                       │
│  画面層（src/ui・src/audio）                 ゲーム API（src/api）            ロジック層             │
│  ┌──────────────────────────────┐   操作    ┌─────────────────────┐        ┌───────────────────┐  │
│  │ ルーター（ハッシュ・Location  │ ───────▶ │ 読む → 計算 → 書く  │ ─────▶ │ ルール（src/domain）│  │
│  │   Guard）                     │ api.xxx() │ GameView に変える   │ 呼ぶ   │ 純粋関数・Rng 引数  │  │
│  │ ストア（GameView・セーブ有無）│ ◀─────── │ 引数の検査・エラー  │        └───────────────────┘  │
│  │ 画面・部品（DOM・SVG）        │ {state,   └──────────┬──────────┘        ┌───────────────────┐  │
│  │ 操作の流れ・メッセージキュー  │  messages}           │ 保存の窓口         │ 表示の計算          │  │
│  │ 演出・入力（タップ・キー）    │                      ▼                    │（src/logic）        │  │
│  │ 効果音・BGM（Web Audio 合成） │ ◀──── 画面層が呼ぶ ──────────────────── │ 線分・地図・並び順・│  │
│  └──────────────────────────────┘                                          │ メッセージ・曲データ│  │
│                                                                             └───────────────────┘  │
│  基盤（src/platform）：localStorage・本番の乱数・時刻・PWA 更新・インストールの案内                  │
│  Service Worker（Workbox）：全ファイル（敵の絵を含む）をキャッシュし、通信なしで起動                 │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. 構成要素

層の決まりは [ADR-0003](MWIZ-ADR-0003-architecture-decision-ja.md)。ESLint で強制する。

### 2.1 ロジック層：ルール（`src/domain/`。純粋関数、Vitest で単体テスト）

| 要素 | 役割 | 仕様書 |
| --- | --- | --- |
| 乱数 | `Rng`（`int`・`chance`）、`SeededRng`（mulberry32）、`SequenceRng`、`SwappableRng` | §23 |
| 定数・敵 | 初期能力値・成長・回避・逃走・ヒール・遭遇率・敵 6 種・出現表 | §6、§15.1 |
| キャラクター | 名前の検査、作成、経験値とレベルアップ、やすむ、周回 | §2、§7.2、§9.3 |
| ダンジョン | 1 階の壁（迷路 + ループ）、5 階層・階段・ボスの配置、不変条件 | §3 |
| 探索 | 移動・回転・踏破記録・遭遇判定・階段・出発と帰還、視界と地図のデータ | §4 |
| 戦闘 | 行動順・回避・ダメージ・逃走・1 ターンの解決・勝利・敗北・ボス撃破 | §5、§9.1 |
| 装備 | マスタ 32 種・レアリティ・ドロップ・所持品・付け替え・入れ替え・実効値 | §8 |
| 実績 | 回数の数え方と補正 | §9.4 |
| 状態と保存の形 | 場所の検査、セーブとの変換、読み込み時の移行 | §10、§21.4 |

### 2.2 ゲーム API（`src/api/`）

| 要素 | 役割 | 仕様書 |
| --- | --- | --- |
| 操作 | `getGame`・`startGame`・`move`・`battle` など 20 の操作。元の REST API と同じ引数・結果・エラー | §22.2 |
| 操作の共通の流れ（`run`） | 保存から読む → ルールで計算 → revision を確かめて書く → GameView。CLEARED に入ったらセーブもまとめて書く | §21.5、§21.6 |
| GameView への変換 | 見せない情報（未踏破のマス・ボスの位置・敵の HP・revision）を入れない | §22.4、§22.5 |
| 引数の検査・エラー | `GameError { status, error, message, details? }`。保存できなければ `storage_error` | §22.3 |
| 保存の窓口 | 保存の値 ⇔ ルールの型の変換と読み書き | §21 |

ゲーム API は保存・乱数・時刻を作るときに受け取る（テストでは偽の保存と `SeededRng` を渡す）。

### 2.3 ロジック層：表示の計算（`src/logic/`。純粋関数、Vitest で単体テスト）

疑似3D の線分・地図の図形・説明文・足元の案内・装備の文言と並び順・付け替えの変化・メニューのカーソル・メッセージの進め方（演出の長さ・遷移の保留）・場面 → 曲・BGM の記法と曲データ・名前の規則（画面向け）・版の表記。仕様書 §11・§20.3。

### 2.4 画面層（`src/ui/`・`src/audio/`）

| 要素 | 役割 | 仕様書 |
| --- | --- | --- |
| ルーター | ハッシュ（`#/inn` など）と LocationGuard。ゲームの状態の場所と違う画面を出さない。メッセージを読み終えるまで遷移を保留 | §11.2、§27.4 |
| ストア | GameView とセーブの有無を持ち、変化を知らせる | §11.10、§27.3 |
| 操作の流れ | 応答待ち・二重送信の防止・エラーの扱い・遭遇の音 | §11.8、§11.9、§11.10 |
| メッセージキュー・演出 | 400ms ごとの逐次表示・スキップ・演出と効果音・動きを減らす設定 | §11.8 |
| 画面・部品 | タイトル・名前入力・宿屋・ダンジョン・戦闘・クリア・入れ替え、メニューから開く画面、共通部品（DOM と SVG で組み立てる。[ADR-0005](MWIZ-ADR-0005-architecture-decision-ja.md)） | §11.3〜§11.7 |
| 入力 | タップ・クリック（ボタン・メニュー・メッセージ欄）、キーボード（矢印・Enter・Space・Esc・Tab） | §11.4、§11.5 |
| 効果音・BGM | Web Audio の合成（[ADR-0008](MWIZ-ADR-0008-architecture-decision-ja.md)）。音の設定のオン / オフ | §12、§25、§26 |

画面はスマートフォンの縦画面での表示を最優先して作る（[ADR-0012](MWIZ-ADR-0012-architecture-decision-ja.md)）。

### 2.5 基盤（`src/platform/`・`public/boot.js`）

| 要素 | 役割 |
| --- | --- |
| 保存 | `localStorage` を `try/catch` で包み、成否を返す。複数のキーをまとめて書き、失敗したら戻す（[ADR-0006](MWIZ-ADR-0006-architecture-decision-ja.md)） |
| 本番の乱数・時刻 | `MathRandomRng`・今の時刻。ゲーム API に渡す |
| PWA 更新 | Service Worker の登録と「更新」の帯（[ADR-0009](MWIZ-ADR-0009-architecture-decision-ja.md)） |
| インストールの案内 | iPhone / Android / PC の手順と「今すぐインストール」 |
| 起動の見張り（`public/boot.js`） | 起動に失敗したら、このアプリの Service Worker とキャッシュだけを消して読み込み直す（[ADR-0009](MWIZ-ADR-0009-architecture-decision-ja.md)） |
| Service Worker | ビルド時に自動生成。全ファイルをキャッシュする |
| テスト用の入口 | `?debug=1` のときだけ `window.__wiz`（地図の全体・乱数の固定・状態の書き込み・応答の遅延）（[ADR-0011](MWIZ-ADR-0011-architecture-decision-ja.md)） |

## 3. 処理の流れ

### 3.1 1 回の操作（例：ダンジョンで前進）

```
移動ボタンのタップ／↑ キー
  └─ 操作の流れ：locked なら捨てる。そうでなければ応答待ちにする
       └─ api.move({ action: 'forward' })
            ├─ 引数の検査（違えば 400）
            ├─ 保存から読む（なければ 404）→ 読み込み時の移行
            ├─ ルール：moveInDungeon(state, action, rng)（壁・移動・踏破記録・遭遇判定）
            ├─ revision を読み直して書く（違えば 409 conflict、書けなければ 500 storage_error）
            └─ { state: GameView, messages }
       ├─ 成功：遭遇ならメッセージ欄を消して encounter の音 → 足元の案内を足して enqueue
       │        → ストアの GameView を置き換える → LocationGuard（保留が終われば戦闘画面へ）
       └─ 失敗：rule_violation はメッセージ欄（赤）、ほかの 4xx はメッセージ + 取り直し、500 は ErrorPanel
```

### 3.2 ボス撃破（クリア時の自動セーブ）

```
api.battle({ command: 'attack' })
  └─ resolveTurn → 勝利 → onBossDefeated（実績 → 経験値・成長 → ボスのドロップ）
       ├─ 空きあり：場所 CLEARED → プレイ中状態とセーブを writeAll でまとめて書く（失敗したら両方戻す）
       └─ 満杯：場所 SWAP（thenClear）→ 拾う／あきらめるの操作で CLEARED → そこでまとめて書く
  └─ 画面：撃破のメッセージ（演出・効果音）を読み終えてからクリア画面へ。BGM は宿屋へ戻るまで無音
```

### 3.3 起動

```
index.html → boot.js（8 秒の見張り）→ main.ts
  ├─ 保存の準備（版・persist）→ ゲーム API を作る（?debug=1 ならテスト用の入口）
  ├─ 音の設定を読む（既定はオフ）→ ストアが getGame・getSave を読む
  ├─ メッセージキュー・低 HP の枠・演出の層・BGM の監督 → ルーターが今の画面を出す
  └─ Service Worker の登録（本番だけ）→ window.__appStarted = true
```

## 4. 保存データ

すべて `localStorage`。キーは `<アプリ識別子>-<名前>`（アプリ識別子は `mini-wiz-game`、[ADR-0007](MWIZ-ADR-0007-architecture-decision-ja.md)）。値は JSON（[ADR-0006](MWIZ-ADR-0006-architecture-decision-ja.md)）。

| 名前 | 中身 | 仕様書 |
| --- | --- | --- |
| `schema` | 保存の形全体の版（最初は 1） | §21.2 |
| `game` | プレイ中の状態（キャラクター・場所・ダンジョン・戦闘・所持品・実績、版 5、revision） | §21.3 |
| `save` | セーブ 1 スロット（キャラクター・所持品・実績、版 3、セーブした時刻） | §21.3 |
| `sound` | 音のオン / オフ（`on` / `off`） | §12.1 |

sessionStorage には起動の復旧の時刻（`mini-wiz-game:boot-repair-at`）だけを置く。

## 5. 配信と公開

| 項目 | 内容 |
| --- | --- |
| 公開 URL | https://tsuku3dayo.github.io/mini-wiz-game/ |
| 参照パス | すべて相対（`./`）。敵の絵も `enemies/<種類>.png`。GitHub Pages のサブパス配信に対応 |
| 公開の流れ | 作業ブランチ → PR（CI）→ main にマージ → 検査が通ったら GitHub Pages に自動公開（main へのマージ = 公開） |
| 更新の届き方 | 新しい版の Service Worker は待機し、利用者がタイトル・宿屋の画面の「更新」で切り替える |

## 6. 非機能要件への対応

| 要件（仕様書 §14） | 構成上の対応 |
| --- | --- |
| 応答時間（操作 100ms 未満、初期表示 1 秒以内） | 通信がない。ルールは同期の純粋関数で、保存は数 KB の JSON。5 階層の生成は 50ms 未満（単体テストで確かめる） |
| 遭遇の音（0.1 秒以内） | 音を事前に用意せず、操作の結果を受けた時点で Web Audio で合成して鳴らす |
| 再現性 | ルールは `Rng` を引数で受け取る純粋関数。同じシードなら同じ結果 |
| 保存 | プレイ中の状態は操作のたびに書くので、閉じる・再読み込み・更新で消えない。`navigator.storage.persist()` を頼む |
| 互換性 | 保存の値に版を持たせ、読み込み時に移行する |
| 対応端末・操作 | スマートフォンの縦画面を最優先（ADR-0012）。すべての操作がタップとキーボードの両方でできる |
| オフライン | Service Worker が全ファイルをキャッシュ。外部リソースを使わない（フォントも端末のもの。[ADR-0010](MWIZ-ADR-0010-architecture-decision-ja.md)） |
| アクセシビリティ | ARIA の決まり（仕様書 §11.11）を部品に入れ、axe-core で E2E から検査する |
| 通信・個人情報 | 通信する部品を持たない |
| 見せない情報 | 画面層は GameView 以外を受け取らない（ADR-0004）。保存は利用者が読めるので、不正防止ではなく、ネタばれ防止と層の分離のため |
| 端末内保存の失敗 | 読めない値は「なし」として起動する。書けないときは操作を失敗にして中身を変えず、ErrorPanel を出す |
