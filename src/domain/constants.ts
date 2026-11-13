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
  goblin: { name: 'ゴブリン', maxHp: 20, attack: 7, defense: 3, speed: 7, exp: 10 },
  skeleton: { name: 'スケルトン', maxHp: 42, attack: 16, defense: 10, speed: 13, exp: 27 },
  orc: { name: 'オークロード', maxHp: 79, attack: 28, defense: 17, speed: 17, exp: 45 },
  darkKnight: { name: 'ダークナイト', maxHp: 110, attack: 45, defense: 28, speed: 26, exp: 75 },
  necromancer: { name: '暗黒のネクロマンサー', maxHp: 800, attack: 60, defense: 40, speed: 30, exp: 1000 },
};

/** 階ごとの出現表（百分率、この順に累積して判定する。仕様書 §6.2） */
export const ENCOUNTER_TABLE: Readonly<Record<number, readonly (readonly [EnemyKind, number])[]>> = {
  1: [['slime', 70], ['goblin', 30]],
  2: [['slime', 30], ['goblin', 50], ['skeleton', 20]],
  3: [['goblin', 30], ['skeleton', 50], ['orc', 20]],
  4: [['skeleton', 30], ['orc', 50], ['darkKnight', 20]],
  5: [['orc', 40], ['darkKnight', 60]],
};

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
