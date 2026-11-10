// クレジットの組（仕様書 §11.5「クレジット」、TC-0040）
import { describe, expect, test } from 'vitest';
import { CREDITS } from '../../src/logic/credits';

describe('クレジット', () => {
  test('TC-0040-03 6 組が仕様書の表と文字まで同じ順で、凍っている', () => {
    expect(CREDITS).toEqual([
      { role: 'PRODUCER', name: 'つくだ よしはる' },
      { role: 'DIRECTOR', name: 'つくだ よしはる' },
      { role: 'GAME DESIGNER', name: 'つくだ よしはる' },
      { role: 'GRAPHIC DESIGNER', name: 'CLAUDE CODE' },
      { role: 'SOUND CREATOR', name: 'CLAUDE CODE' },
      { role: 'PROGRAMMER', name: 'CLAUDE CODE' },
    ]);
    // 「つくだ」と「よしはる」の間は半角スペース 1 つ
    expect(CREDITS[0].name).toBe('つくだ よしはる');
    expect(Object.isFrozen(CREDITS)).toBe(true);
    for (const c of CREDITS) expect(Object.isFrozen(c)).toBe(true);
  });
});
