// ルールの定数（仕様書 §6、§15.1、§15.2、§24.1）

export type EnemyKind = 'slime' | 'goblin' | 'skeleton' | 'orc' | 'darkKnight' | 'necromancer';

export interface EnemyStats {
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  exp: number;
}

/** 敵 6 種（周回数・レベルで変わらない） */
export const ENEMIES: Readonly<Record<EnemyKind, EnemyStats>> = {
  slime: { name: 'スライム', maxHp: 24, attack: 4, defense: 0, speed: 0, exp: 8 },
  goblin: { name: 'ゴブリン', maxHp: 20, attack: 7, defense: 3, speed: 7, exp: 20 },
  skeleton: { name: 'スケルトン', maxHp: 32, attack: 21, defense: 5, speed: 18, exp: 54 },
  orc: { name: 'オークロード', maxHp: 99, attack: 38, defense: 7, speed: 7, exp: 90 },
  darkKnight: { name: 'ダークナイト', maxHp: 110, attack: 45, defense: 28, speed: 26, exp: 150 },
  necromancer: { name: '暗黒のネクロマンサー', maxHp: 800, attack: 80, defense: 0, speed: 50, exp: 1000 },
};

/** 階ごとの出現表（百分率、この順に累積して判定する。仕様書 §6.2。v1.25 で改めた） */
export const ENCOUNTER_TABLE: Readonly<Record<number, readonly (readonly [EnemyKind, number])[]>> = {
  1: [['slime', 100]],
  2: [['slime', 50], ['goblin', 50]],
  3: [['goblin', 50], ['skeleton', 50]],
  4: [['skeleton', 50], ['orc', 50]],
  5: [['orc', 50], ['darkKnight', 50]],
};

/** 扉の敵（仕様書 §3.6。v1.25）。5F は扉の敵なし（ボスの扉だけ） */
export const DOOR_ENEMY: Readonly<Record<number, EnemyKind>> = { 1: 'goblin', 2: 'skeleton', 3: 'orc', 4: 'darkKnight' };

/** 宝箱の中身を、どの敵のドロップの段階で決めるか（仕様書 §3.6・§8.4。v1.25） */
export const CHEST_SOURCE: Readonly<Record<number, EnemyKind>> = { 1: 'slime', 2: 'goblin', 3: 'goblin', 4: 'skeleton', 5: 'orc' };

/** 回避率 clamp(受ける側の速 − 攻撃側の速 + 受ける側のかいひ, min, max)（v1.14） */
export const EVASION = { min: 0, max: 90 } as const;
export const HEAL = { mpCost: 3, amount: 30 } as const;
export const FLEE = { base: 50, perSpeed: 5, min: 10, max: 90 } as const;
export const EXP_FACTOR = 12;
export const ENCOUNTER_RATE = 0.2;
export const DUNGEON_SIZE = 10;
export const FLOOR_COUNT = 5;
export const NAME_MAX_LENGTH = 8;
export const INITIAL_STATS = { level: 1, exp: 0, maxHp: 30, maxMp: 10, attack: 5, defense: 5, speed: 5 } as const;
export const GROWTH = { maxHp: [8, 12], maxMp: [2, 4], attack: [1, 2], defense: [1, 2], speed: [1, 2] } as const;
