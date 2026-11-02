// ゲーム状態の型・場所の検査・読み込み時の移行・セーブとの変換（仕様書 §10、§21.3、§21.4、§21.6、§24.3）
import { InvalidStateError } from './errors';
import { conformItem, isItemId, isRarity, ITEMS, SLOTS, type ItemId, type Rarity, type Slot } from './items';
import { emptyInventory } from './loot';
import { initialRecords, normalizeRecords, type Records } from './records';
import type { EnemyKind } from './constants';

export const GAME_SCHEMA_VERSION = 5;
export const SAVE_SCHEMA_VERSION = 3;

export type Location = 'INN' | 'DUNGEON' | 'BATTLE' | 'CLEARED' | 'SWAP';
export type Facing = 'N' | 'E' | 'S' | 'W';

export interface Position {
  x: number;
  y: number;
}

export interface FloorData {
  walls: number[];          // 長さ width*height、index = y*width+x。N=1,E=2,S=4,W=8（1=壁）
  up: Position;             // 上り階段。1F は入口
  down: Position | null;    // 下り階段。5F は null
  boss: Position | null;    // 5F のみ
  visited: boolean[];       // 長さ width*height。一度でも立ったマス
}

export interface DungeonData {
  width: number;
  height: number;
  floors: FloorData[];
  floor: number;            // 1〜5
  player: Position & { facing: Facing };
}

export interface BattleData {
  enemy: { kind: EnemyKind; hp: number };
  isBoss: boolean;
}

export interface Character {
  name: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface ItemInstance {
  id: number;
  itemId: ItemId;
  rarity: Rarity;
  value: number; // 倍率適用後
}

export interface InventoryData {
  equipped: Record<Slot, ItemInstance | null>;
  items: ItemInstance[]; // 拾った順（古い → 新しい）
  nextId: number;
  pending: { item: ItemInstance; thenClear: boolean } | null;
}

/** 能力値（attack 等）は基礎値。実効値は保存しない */
export interface GameStateData extends Character {
  location: Location;
  dungeon: DungeonData | null;
  battle: BattleData | null;
  inventory: InventoryData;
  records: Records;
}

export type MessageTone = 'normal' | 'success' | 'danger';
export type MessageEffect = 'levelUp' | 'rareDrop' | 'bossAppear' | 'bossDefeat' | 'clear';

export interface Message {
  text: string;
  tone: MessageTone;
  rarity?: Rarity;          // ドロップの行だけ
  effect?: MessageEffect;   // 演出の印
}

/** 状態を変える操作の結果（API の { state, messages } の元） */
export interface StepResult {
  state: GameStateData;
  messages: Message[];
}

export interface StoredGameState extends Character {
  schemaVersion: number;
  revision: number;
  location: Location;
  dungeon: unknown;
  battle: unknown;
  inventory?: unknown;
  records?: unknown;
  updatedAt: string;
}

export interface SaveData extends Character {
  schemaVersion: number;
  inventory: InventoryData;
  records: Records;
}

export interface StoredSave extends Character {
  schemaVersion: number;
  inventory?: unknown;
  records?: unknown;
  savedAt: string;
}

/** マスタにないので取り除いた個体（ゲーム API が console.warn で出す） */
export interface DroppedItem {
  id: number;
  itemId: string;
}

/** 場所が allowed になければ 409 invalid_state（仕様書 §10.3） */
export function assertLocation(state: GameStateData, ...allowed: Location[]): void {
  if (!allowed.includes(state.location)) throw new InvalidStateError();
}

/** キャラクターの 10 項目だけを取り出す */
export function pickCharacter(c: Character): Character {
  return {
    name: c.name,
    level: c.level,
    exp: c.exp,
    hp: c.hp,
    maxHp: c.maxHp,
    mp: c.mp,
    maxMp: c.maxMp,
    attack: c.attack,
    defense: c.defense,
    speed: c.speed,
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

type ReadItem = { kind: 'ok'; item: ItemInstance } | { kind: 'dropped'; item: DroppedItem } | { kind: 'bad' };

/** 個体を 1 つ読む。形の違う値は bad（黙って捨てる）、マスタにない種類は dropped */
function readItem(raw: unknown): ReadItem {
  if (!isObject(raw)) return { kind: 'bad' };
  const { id, itemId, rarity, value } = raw;
  if (!Number.isInteger(id) || !Number.isInteger(value) || !isRarity(rarity) || typeof itemId !== 'string') {
    return { kind: 'bad' };
  }
  if (!isItemId(itemId)) return { kind: 'dropped', item: { id: id as number, itemId } };
  return { kind: 'ok', item: conformItem({ id: id as number, itemId, rarity, value: value as number }) };
}

/** 所持品の補完（仕様書 §8.3、§21.4）。null・形の違う値は空の所持品 */
export function normalizeInventory(raw: unknown): { inv: InventoryData; dropped: DroppedItem[] } {
  if (!isObject(raw)) return { inv: emptyInventory(), dropped: [] };
  const dropped: DroppedItem[] = [];
  const ids: number[] = [];
  const take = (v: unknown): ItemInstance | null => {
    const r = readItem(v);
    if (r.kind === 'dropped') {
      dropped.push(r.item);
      ids.push(r.item.id);
    }
    if (r.kind !== 'ok') return null;
    ids.push(r.item.id);
    return r.item;
  };

  const inv = emptyInventory();
  const equipped = isObject(raw.equipped) ? raw.equipped : {};
  for (const slot of SLOTS) {
    const it = take(equipped[slot]);
    // 部位の合わない個体は形の違う値として捨てる（仕様書に定めがないため、ここで決めた）
    inv.equipped[slot] = it && ITEMS[it.itemId].slot === slot ? it : null;
  }
  if (Array.isArray(raw.items)) {
    for (const v of raw.items) {
      const it = take(v);
      if (it) inv.items.push(it);
    }
  }
  if (isObject(raw.pending) && typeof raw.pending.thenClear === 'boolean') {
    const it = take(raw.pending.item);
    if (it) inv.pending = { item: it, thenClear: raw.pending.thenClear };
  }
  const saved = Number.isInteger(raw.nextId) ? (raw.nextId as number) : 1;
  inv.nextId = Math.max(saved, ...ids.map((id) => id + 1), 1);
  return { inv, dropped };
}

/** 版 2 のダンジョンに踏破記録を補う。今の階の今の位置だけ true（ボスのマスなら記録しない） */
function addVisited(d: DungeonData): DungeonData {
  const size = d.width * d.height;
  const { x, y } = d.player;
  const floors = d.floors.map((f, i) => {
    const visited: boolean[] = new Array<boolean>(size).fill(false);
    const onBoss = f.boss !== null && f.boss.x === x && f.boss.y === y;
    if (i === d.floor - 1 && !onBoss) visited[y * d.width + x] = true;
    return { ...f, visited };
  });
  return { ...d, floors };
}

/** 読み込み時の移行（仕様書 §21.4）。onDropped にはマスタにない装備を取り除いた一覧を渡す */
export function migrateGameState(row: StoredGameState, onDropped?: (dropped: DroppedItem[]) => void): GameStateData {
  let location = row.location;
  let dungeon = (row.dungeon ?? null) as DungeonData | null;
  let battle = (row.battle ?? null) as BattleData | null;
  if (row.schemaVersion === 2 && dungeon) {
    dungeon = addVisited(dungeon);
  } else if (!(row.schemaVersion >= 2)) {
    // 版 1（MVP）の 1 階層のマップと戦闘中の敵は捨てて、宿屋に戻す
    if (location === 'DUNGEON' || location === 'BATTLE') {
      location = 'INN';
      dungeon = null;
      battle = null;
    }
  }
  const { inv, dropped } = normalizeInventory(row.inventory);
  if (dropped.length > 0) onDropped?.(dropped);
  return {
    ...pickCharacter(row),
    location,
    dungeon,
    battle,
    inventory: inv,
    records: normalizeRecords(row.records),
  };
}

/** セーブの中身（仕様書 §21.6）。入れ替え待ちは含めない。savedAt は書くときに足す */
export function toSaveData(state: GameStateData): SaveData {
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    ...pickCharacter(state),
    inventory: { ...state.inventory, pending: null },
    records: state.records,
  };
}

/** つづきから：場所 INN、ダンジョン・戦闘・入れ替え待ちはなし */
export function fromSaveData(save: SaveData): GameStateData {
  return {
    ...pickCharacter(save),
    location: 'INN',
    dungeon: null,
    battle: null,
    inventory: { ...save.inventory, pending: null },
    records: save.records,
  };
}

/** セーブの読み込み時の移行（仕様書 §21.4）。知らない版は例外 */
export function migrateSave(save: StoredSave, onDropped?: (dropped: DroppedItem[]) => void): SaveData {
  const v = save.schemaVersion;
  if (v !== 1 && v !== 2 && v !== 3) throw new Error(`Unsupported save schemaVersion: ${v}`);
  let inventory = emptyInventory();
  if (v >= 2) {
    const { inv, dropped } = normalizeInventory(save.inventory);
    if (dropped.length > 0) onDropped?.(dropped);
    inventory = { ...inv, pending: null };
  }
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    ...pickCharacter(save),
    inventory,
    records: v === 3 ? normalizeRecords(save.records) : initialRecords(),
  };
}
