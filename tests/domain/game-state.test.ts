import { describe, expect, test } from 'vitest';
import { InvalidStateError } from '../../src/domain/errors';
import {
  assertLocation,
  fromSaveData,
  migrateGameState,
  migrateSave,
  normalizeInventory,
  toSaveData,
  type DroppedItem,
  type StoredGameState,
  type StoredSave,
} from '../../src/domain/game-state';
import { conformItem, valueRange } from '../../src/domain/items';
import { emptyInventory } from '../../src/domain/loot';
import { initialRecords, normalizeRecords } from '../../src/domain/records';
import { deepFreeze } from '../helpers/deep-freeze';
import { LOCATIONS, makeItem, makeState } from '../helpers/fixtures';
import { openMap } from '../helpers/maps';

const CHARACTER = { name: 'ゆうしゃ', level: 2, exp: 30, hp: 20, maxHp: 40, mp: 5, maxMp: 12, attack: 6, defense: 6, speed: 7 };

function stored(over: Partial<StoredGameState>): StoredGameState {
  return { ...CHARACTER, schemaVersion: 5, revision: 3, location: 'INN', dungeon: null, battle: null, updatedAt: '2026-11-02T00:00:00.000Z', ...over };
}

/** 版 2 のダンジョン（踏破記録なし） */
function v2Dungeon(player: { x: number; y: number }, floor: number) {
  const d = openMap(player, {}, floor);
  return { ...d, floors: d.floors.map((f) => ({ walls: f.walls, up: f.up, down: f.down, boss: f.boss })) };
}

const SAVE_INVENTORY = {
  equipped: { weapon: makeItem(1, 'weapon1', 'N', 2), armor: null, shield: null, accessory: null },
  items: [makeItem(2, 'armor1', 'N', 1)],
  nextId: 4,
  pending: { item: makeItem(3, 'shield1', 'N', 1), thenClear: false },
};
const RECORDS = { battles: 5, kills: 4, deaths: 1, laps: 2, bossKills: 1 };

describe('セーブして、つづきから再開する', () => {
  test('TC-0009-09 migrateGameState：版 2 は踏破記録を補い、版 1 はダンジョン・戦闘を捨てて宿屋へ。どの版も所持品・実績を補う', () => {
    // 版 2・ダンジョンあり：各階に長さ 100 の visited。今の階の今の位置だけ true
    const row2 = deepFreeze(stored({ schemaVersion: 2, location: 'DUNGEON', dungeon: v2Dungeon({ x: 3, y: 4 }, 2) }));
    const s2 = migrateGameState(row2);
    expect(s2.location).toBe('DUNGEON');
    expect(s2.dungeon!.floors).toHaveLength(5);
    s2.dungeon!.floors.forEach((f, i) => {
      expect(f.visited).toHaveLength(100);
      expect(f.visited.filter(Boolean)).toHaveLength(i === 1 ? 1 : 0);
    });
    expect(s2.dungeon!.floors[1].visited[4 * 10 + 3]).toBe(true);
    expect(s2.inventory).toEqual(emptyInventory());
    expect(s2.records).toEqual(initialRecords());

    // 版 2・ボスのマスにいる：記録しない
    const onBoss = migrateGameState(deepFreeze(stored({ schemaVersion: 2, location: 'BATTLE', dungeon: v2Dungeon({ x: 9, y: 0 }, 5), battle: { enemy: { kind: 'necromancer', hp: 260 }, isBoss: true } })));
    expect(onBoss.dungeon!.floors.every((f) => f.visited.length === 100 && f.visited.every((v) => !v))).toBe(true);
    expect(onBoss.battle).toEqual({ enemy: { kind: 'necromancer', hp: 260 }, isBoss: true });

    // 版 1：DUNGEON・BATTLE は INN に戻し、ダンジョンと戦闘を null。ほかの場所はそのまま
    for (const location of ['DUNGEON', 'BATTLE'] as const) {
      const s1 = migrateGameState(deepFreeze(stored({ schemaVersion: 1, location, dungeon: { old: true }, battle: location === 'BATTLE' ? { enemy: { kind: 'slime', hp: 3 }, isBoss: false } : null })));
      expect(s1).toMatchObject({ location: 'INN', dungeon: null, battle: null });
    }
    expect(migrateGameState(deepFreeze(stored({ schemaVersion: 1, location: 'INN' }))).location).toBe('INN');

    // 版 5：そのまま。キャラクターの 10 項目はそのまま、所持品・実績は補う
    const d5 = openMap({ x: 1, y: 1 });
    const s5 = migrateGameState(deepFreeze(stored({ location: 'DUNGEON', dungeon: d5, inventory: SAVE_INVENTORY, records: { ...RECORDS, deaths: -1 } })));
    expect(s5).toEqual({ ...CHARACTER, location: 'DUNGEON', dungeon: d5, battle: null, inventory: SAVE_INVENTORY, records: { ...RECORDS, deaths: 0 }, saveSlot: null });

    // migrateSave：版 1 は所持品を空・実績を初期値
    const save = (schemaVersion: number): StoredSave => deepFreeze({ ...CHARACTER, schemaVersion, inventory: SAVE_INVENTORY, records: RECORDS, savedAt: '2026-11-02T00:00:00.000Z' });
    const pendingNull = { ...SAVE_INVENTORY, pending: null };
    expect(migrateSave(save(1))).toEqual({ schemaVersion: 3, ...CHARACTER, inventory: emptyInventory(), records: initialRecords() });
    // 版 2 は所持品を補い（入れ替え待ちは null）、実績を初期値
    expect(migrateSave(save(2))).toEqual({ schemaVersion: 3, ...CHARACTER, inventory: pendingNull, records: initialRecords() });
    // 版 3 は両方を補う
    expect(migrateSave(save(3))).toEqual({ schemaVersion: 3, ...CHARACTER, inventory: pendingNull, records: RECORDS });
    // それ以外は例外
    for (const v of [0, 4, 9]) expect(() => migrateSave(save(v))).toThrow(`Unsupported save schemaVersion: ${v}`);
  });
});

describe('できない操作が分かる', () => {
  test('TC-0012-01 assertLocation は場所が allowed になければ 409 invalid_state を投げ、あれば投げない。入力は変わらない', () => {
    for (const location of LOCATIONS) {
      const s = deepFreeze(makeState(location));
      expect(() => assertLocation(s, location)).not.toThrow();
      expect(() => assertLocation(s, 'INN', 'DUNGEON', 'BATTLE', 'SWAP', 'CLEARED')).not.toThrow();
      const others = LOCATIONS.filter((l) => l !== location);
      let caught: unknown = null;
      try {
        assertLocation(s, ...others);
      } catch (e) {
        caught = e;
      }
      expect(caught).toBeInstanceOf(InvalidStateError);
      expect(caught).toMatchObject({ status: 409, code: 'invalid_state', message: 'その操作は いまは できない' });
    }
  });
});

// 確認 ID のない、補正と変換の決まり（仕様書 §8.3、§9.4、§21.4、§21.6）
describe('読み込み時の補正とセーブの変換', () => {
  test('normalizeInventory：null・形違いは空。マスタにない種類は取り除いて知らせ、nextId は最大の ID + 1 以上', () => {
    expect(normalizeInventory(null)).toEqual({ inv: emptyInventory(), dropped: [] });
    expect(normalizeInventory([1, 2])).toEqual({ inv: emptyInventory(), dropped: [] });
    const raw = deepFreeze({
      equipped: { weapon: { id: 9, itemId: 'sword99', rarity: 'N', value: 1 }, armor: { id: 2, itemId: 'weapon1', rarity: 'N', value: 1 }, shield: null, accessory: makeItem(3, 'accessory8', 'LG', 20) },
      items: [makeItem(4, 'armor1', 'R', 2), { id: 'x', itemId: 'armor1', rarity: 'N', value: 1 }, { id: 5, itemId: 'armor1', rarity: 'Z', value: 1 }, { id: 12, itemId: 'old', rarity: 'R', value: 3 }],
      nextId: 2,
      pending: { item: makeItem(6, 'weapon1', 'N', 1), thenClear: true },
    });
    const { inv, dropped } = normalizeInventory(raw);
    expect(dropped).toEqual<DroppedItem[]>([{ id: 9, itemId: 'sword99' }, { id: 12, itemId: 'old' }]);
    expect(inv.equipped).toEqual({ weapon: null, armor: null, shield: null, accessory: makeItem(3, 'accessory8', 'LG', 20) });
    expect(inv.items).toEqual([makeItem(4, 'armor1', 'R', 2)]);
    expect(inv.pending).toEqual({ item: makeItem(6, 'weapon1', 'N', 1), thenClear: true });
    expect(inv.nextId).toBe(13);
  });

  test('conformItem：段階で出ないレアリティは近いものに替えて値を掛け直し、範囲に切り詰める。冪等', () => {
    // ロングソード（段階 4：R・SR）の N 9 → R、floor(9×12/10)=10
    expect(conformItem(makeItem(1, 'weapon4', 'N', 9))).toEqual(makeItem(1, 'weapon4', 'R', 10));
    // エクスカリバー（段階 8：LG）の UR 40 → LG、floor(40×30/20)=60
    expect(conformItem(makeItem(1, 'weapon8', 'UR', 40))).toEqual(makeItem(1, 'weapon8', 'LG', 60));
    // ショートソード（段階 1：N・R）の SR → R（近い方）、範囲 [1, 2] に切り詰め
    expect(conformItem(makeItem(1, 'weapon1', 'SR', 30))).toEqual(makeItem(1, 'weapon1', 'R', 2));
    // ミスリルソード（段階 6：SR・UR）の LG → UR、R → SR
    expect(conformItem(makeItem(1, 'weapon6', 'LG', 48)).rarity).toBe('UR');
    expect(conformItem(makeItem(1, 'weapon6', 'R', 18)).rarity).toBe('SR');
    // 合っている個体はそのまま、何度通しても同じ
    const ok = makeItem(1, 'weapon3', 'R', 7);
    expect(conformItem(ok)).toBe(ok);
    const once = conformItem(makeItem(1, 'armor6', 'N', 1));
    expect(conformItem(once)).toEqual(once);
    expect(valueRange('weapon3', 'R')).toEqual([6, 9]);
    expect(valueRange('weapon8', 'LG')).toEqual([60, 78]);
  });

  test('normalizeRecords：項目ごとに 0 以上の整数（周回数は 1 以上）でなければ初期値', () => {
    expect(normalizeRecords({ battles: -1, kills: 1.5, deaths: '2', laps: 0, bossKills: 3 })).toEqual({ battles: 0, kills: 0, deaths: 0, laps: 1, bossKills: 3 });
    expect(normalizeRecords(null)).toEqual(initialRecords());
    expect(normalizeRecords(RECORDS)).toEqual(RECORDS);
  });

  test('toSaveData は版 3・入れ替え待ちなし（saveSlot は入れない）、fromSaveData は宿屋から・saveSlot は読んだスロット', () => {
    const s = deepFreeze(makeState('SWAP', { ...CHARACTER, records: RECORDS, saveSlot: 2 }));
    const save = toSaveData(s);
    expect(save).toEqual({ schemaVersion: 3, ...CHARACTER, inventory: { ...s.inventory, pending: null }, records: RECORDS });
    expect(fromSaveData(deepFreeze(save), 3)).toEqual({ ...CHARACTER, location: 'INN', dungeon: null, battle: null, inventory: { ...s.inventory, pending: null }, records: RECORDS, saveSlot: 3 });
  });
});
