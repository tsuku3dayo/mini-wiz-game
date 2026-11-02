// 画面層が使う型（仕様書 §22.3、§24.5）。画面層は src/domain/ の型を直接 import しない

export type Location = 'INN' | 'DUNGEON' | 'BATTLE' | 'CLEARED' | 'SWAP';
export type Facing = 'N' | 'E' | 'S' | 'W';
export type MessageTone = 'normal' | 'success' | 'danger';
export type MessageEffect = 'levelUp' | 'rareDrop' | 'bossAppear' | 'bossDefeat' | 'clear';
export type Rarity = 'N' | 'R' | 'SR' | 'UR' | 'LG';
export type Slot = 'weapon' | 'armor' | 'shield' | 'accessory';
export type StatKey = 'attack' | 'defense' | 'speed' | 'maxHp' | 'maxMp';
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
}

export interface GameResponse {
  state: GameView | null;
}

export interface CommandResult {
  state: GameView;
  messages: Message[];
}

export interface SaveSummary {
  exists: boolean;
  summary: { name: string; level: number; savedAt: string } | null;
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
  getSave(): Promise<SaveSummary>;
  startGame(input: { name: string }): Promise<CommandResult>;
  quitGame(): Promise<void>;
  save(): Promise<CommandResult>;
  load(): Promise<CommandResult>;
  rest(): Promise<CommandResult>;
}
