// 画面層が使う型（仕様書 §22.3、§24.5）。画面層は src/domain/ の型を直接 import しない

export type Location = 'INN' | 'DUNGEON' | 'BATTLE' | 'CLEARED' | 'SWAP';
export type Facing = 'N' | 'E' | 'S' | 'W';
export type MessageTone = 'normal' | 'success' | 'danger';
export type MessageEffect = 'levelUp' | 'rareDrop' | 'bossAppear' | 'bossDefeat' | 'clear';
export type Rarity = 'N' | 'R' | 'SR' | 'UR' | 'LG';
export type Slot = 'weapon' | 'armor' | 'shield' | 'accessory';
export type StatKey = 'attack' | 'defense' | 'speed' | 'evasion' | 'maxHp' | 'maxMp';
export type Stats = Record<StatKey, number>;
export type EnemyKind = 'slime' | 'goblin' | 'skeleton' | 'orc' | 'darkKnight' | 'necromancer';

export interface Message {
  text: string;
  tone: MessageTone;
  rarity?: Rarity;
  effect?: MessageEffect;
}

export interface Records {
  battles: number;
  kills: number;
  deaths: number;
  laps: number;
  bossKills: number;
}

export interface ItemView {
  id: number;
  itemId: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  stat: StatKey;
  stats: StatKey[];
  value: number;
}

export interface InventoryView {
  equipped: Record<Slot, ItemView | null>;
  items: ItemView[]; // 新しい順。装備中を含まない
  count: number;
  capacity: number;
}

export interface CharacterView {
  name: string;
  level: number;
  exp: number;
  nextLevelExp: number;
  expToNext: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  speed: number;
  evasion: number; // たての補正そのもの（基礎値は 0。v1.14）
  base: Stats;
  bonus: Stats;
}

export type Side = 'wall' | 'open';
export type StairsView = 'up' | 'down' | 'entrance' | null;

export interface DepthView {
  left: Side;
  right: Side;
  front: Side;
  leftFront?: Side;
  rightFront?: Side;
  stairs: StairsView;
}

export interface AutoMapCell {
  walls: { n: boolean; e: boolean; s: boolean; w: boolean };
  stairs: StairsView;
}

export interface AutoMapView {
  width: number;
  height: number;
  cells: (AutoMapCell | null)[];
  player: { x: number; y: number };
}

export interface DungeonView {
  floor: number;
  facing: Facing;
  underfoot: StairsView;
  depths: DepthView[];
  map: AutoMapView;
}

export interface BattleView {
  enemyKind: EnemyKind;
  enemyName: string;
  isBoss: boolean;
  canHeal: boolean;
  canFlee: boolean;
}

export interface GameView {
  location: Location;
  character: CharacterView;
  dungeon: DungeonView | null;
  battle: BattleView | null;
  clear: { autoSaved: boolean } | null;
  inventory: InventoryView;
  pendingDrop: ItemView | null;
  canHeal: boolean;
  records: Records;
  /** 最後に使ったスロット（宿屋のセーブの初めのカーソル。v1.14） */
  saveSlot: SaveSlot | null;
}

export interface GameResponse {
  state: GameView | null;
}

export interface CommandResult {
  state: GameView;
  messages: Message[];
}

/** セーブのスロット（v1.14） */
export type SaveSlot = 1 | 2 | 3;

/** スロット 1 つのセーブの要約（getSaves。v1.14） */
export interface SaveSlotSummary {
  slot: SaveSlot;
  name: string;
  level: number;
  savedAt: string;
}

/** 3 スロットの一覧（空き・読めないものは null。長さ 3） */
export interface SaveList {
  slots: (SaveSlotSummary | null)[];
}

export type MoveAction = 'forward' | 'backward' | 'turnLeft' | 'turnRight';
export type BattleCommand = 'attack' | 'heal' | 'flee';
export type StairsDirection = 'down' | 'up';

export interface FieldError {
  field: string;
  message: string;
}

export interface GameErrorBody {
  status: 400 | 404 | 409 | 500;
  error: string;
  message: string;
  details?: FieldError[];
}

/** ゲーム API の操作が reject するエラー（仕様書 §22.3） */
export class GameError extends Error implements GameErrorBody {
  readonly status: 400 | 404 | 409 | 500;
  readonly error: string;
  readonly details?: FieldError[];

  constructor(body: GameErrorBody) {
    super(body.message);
    this.name = 'GameError';
    this.status = body.status;
    this.error = body.error;
    if (body.details && body.details.length > 0) this.details = body.details;
  }
}

/** ゲーム API（仕様書 §22.2）。操作は作る TASK ごとに足す */
export interface GameApi {
  getGame(): Promise<GameResponse>;
  getSaves(): Promise<SaveList>;
  startGame(input: { name: string }): Promise<CommandResult>;
  quitGame(): Promise<void>;
  save(input: { slot: SaveSlot }): Promise<CommandResult>;
  load(input: { slot: SaveSlot }): Promise<CommandResult>;
  rest(): Promise<CommandResult>;
  /** クリアの画面から宿屋へ（周回） */
  continueGame(): Promise<CommandResult>;
  enterDungeon(): Promise<CommandResult>;
  move(input: { action: MoveAction }): Promise<CommandResult>;
  stairs(input: { direction: StairsDirection }): Promise<CommandResult>;
  returnToInn(): Promise<CommandResult>;
  /** ダンジョンのヒール */
  heal(): Promise<CommandResult>;
  battle(input: { command: BattleCommand }): Promise<CommandResult>;
  equip(input: { itemId: number }): Promise<CommandResult>;
  unequip(input: { slot: Slot }): Promise<CommandResult>;
  discard(input: { itemId: number }): Promise<CommandResult>;
  /** 満杯のときの入れ替え：所持品の discardId を捨てて拾う */
  lootTake(input: { discardId: number }): Promise<CommandResult>;
  lootAbandon(): Promise<CommandResult>;
  /** テスト用の入口（?debug=1）からだけ呼ぶ。今の階の全情報（仕様書 §28） */
  debugDungeon(): Promise<DebugDungeon>;
}

/** debugDungeon の結果（v1.0 の GET /api/debug/dungeon と同じ中身） */
export interface DebugDungeon {
  floor: number;
  player: { x: number; y: number; facing: Facing };
  walls: number[];
  up: { x: number; y: number };
  down: { x: number; y: number } | null;
  boss: { x: number; y: number } | null;
  visited: boolean[];
}
