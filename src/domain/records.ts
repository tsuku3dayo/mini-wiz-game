// 実績（仕様書 §9.4）

export interface Records {
  battles: number;    // 総戦闘回数
  kills: number;      // 討伐数（ボスを含む）
  deaths: number;     // 死亡回数
  laps: number;       // 周回数（今何周目か、1 から）
  bossKills: number;  // ボス討伐数
}

export function initialRecords(): Records {
  return { battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 0 };
}

/** 保存値の補正：項目ごとに「整数かつ 0 以上（周回数は 1 以上）」なら採用し、そうでなければその項目だけ初期値 */
export function normalizeRecords(raw: unknown): Records {
  const base = initialRecords();
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return base;
  const r = raw as Record<string, unknown>;
  const pick = (key: keyof Records, min: number): number => {
    const v = r[key];
    return typeof v === 'number' && Number.isInteger(v) && v >= min ? v : base[key];
  };
  return {
    battles: pick('battles', 0),
    kills: pick('kills', 0),
    deaths: pick('deaths', 0),
    laps: pick('laps', 1),
    bossKills: pick('bossKills', 0),
  };
}

export const countBattle = (r: Records): Records => ({ ...r, battles: r.battles + 1 });
export const countKill = (r: Records): Records => ({ ...r, kills: r.kills + 1 });
export const countDeath = (r: Records): Records => ({ ...r, deaths: r.deaths + 1 });
/** ボスに勝つと、討伐数・ボス討伐数・周回数が 1 ずつ増える */
export const countBossKill = (r: Records): Records => ({
  ...r,
  kills: r.kills + 1,
  bossKills: r.bossKills + 1,
  laps: r.laps + 1,
});
