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
  slime: { name: 'スライム', maxHp: 12, attack: 4, defense: 2, speed: 3, exp: 4 },
  goblin: { name: 'ゴブリン', maxHp: 18, attack: 6, defense: 3, speed: 6, exp: 10 },
  skeleton: { name: 'スケルトン', maxHp: 26, attack: 9, defense: 6, speed: 5, exp: 18 },
  orc: { name: 'オーク', maxHp: 48, attack: 16, defense: 10, speed: 5, exp: 30 },
  darkKnight: { name: 'ダークナイト', maxHp: 70, attack: 24, defense: 16, speed: 10, exp: 50 },
  necromancer: { name: '暗黒のネクロマンサー', maxHp: 260, attack: 34, defense: 20, speed: 14, exp: 1000 },
};

/** 階ごとの出現表（百分率、この順に累積して判定する。仕様書 §6.2） */
export const ENCOUNTER_TABLE: Readonly<Record<number, readonly (readonly [EnemyKind, number])[]>> = {
  1: [['slime', 70], ['goblin', 30]],
  2: [['slime', 30], ['goblin', 50], ['skeleton', 20]],
  3: [['goblin', 30], ['skeleton', 50], ['orc', 20]],
  4: [['skeleton', 30], ['orc', 50], ['darkKnight', 20]],
  5: [['orc', 40], ['darkKnight', 60]],
};

export const EVASION = { base: 5, perSpeed: 2, min: 5, max: 30 } as const;
export const HEAL = { mpCost: 3, amount: 30 } as const;
export const FLEE = { base: 50, perSpeed: 5, min: 10, max: 90 } as const;
export const EXP_FACTOR = 12;
export const ENCOUNTER_RATE = 0.2;
export const DUNGEON_SIZE = 10;
export const FLOOR_COUNT = 5;
export const NAME_MAX_LENGTH = 8;
export const INITIAL_STATS = { level: 1, exp: 0, maxHp: 30, maxMp: 10, attack: 5, defense: 5, speed: 5 } as const;
export const GROWTH = { maxHp: [8, 12], maxMp: [2, 4], attack: [1, 2], defense: [1, 2], speed: [1, 2] } as const;
