import type { HeroDef, HeroDefId, EnemyDef, EnemyDefId } from './types.ts';

export const GRID_SIZE = 9;
export const TILE_SIZE = 56;
export const BOARD_PX = GRID_SIZE * TILE_SIZE;
export const CENTER_TILE = Math.floor(GRID_SIZE / 2);
export const CENTER_PX = CENTER_TILE * TILE_SIZE + TILE_SIZE / 2;

export const TOTAL_WAVES = 10;
export const BOSS_WAVE = 10;

export const STATUE_MAX_HP = 300;
export const STATUE_ENGAGE_RADIUS = TILE_SIZE * 0.75;
export const HERO_ENGAGE_RADIUS = TILE_SIZE * 0.8;

// The statue can defend itself a little, but is deliberately too weak to clear
// a wave alone — roughly enough to take down half of wave 1's grunts unassisted.
export const STATUE_ATK = 4;
export const STATUE_ATK_INTERVAL_MS = 1200;

export const STARTING_GOLD = 30;

export const XP_PER_KILL = 8;
export const LEVEL_STAT_MULT = 1.15;
export const LEVEL_XP_MULT = 1.4;

export const BOON_CHOICES_COUNT = 3;
export const FLOAT_TEXT_RISE_PX = 42;
export const FLOAT_TEXT_TTL_MS = 900;
export const LEVEL_FLASH_MS = 650;

export const HERO_DEFS: Record<HeroDefId, HeroDef> = {
  militia: {
    id: 'militia',
    name: 'Militia',
    cost: 10,
    hp: 40,
    atk: 6,
    range: TILE_SIZE * 1.0,
    atkIntervalMs: 900,
    color: 0x8fbf6b,
    radius: 12,
  },
  archer: {
    id: 'archer',
    name: 'Archer',
    cost: 15,
    hp: 26,
    atk: 8,
    range: TILE_SIZE * 3.2,
    atkIntervalMs: 750,
    color: 0x6bb6bf,
    radius: 11,
  },
  knight: {
    id: 'knight',
    name: 'Knight',
    cost: 20,
    hp: 75,
    atk: 10,
    range: TILE_SIZE * 1.0,
    atkIntervalMs: 1000,
    color: 0xd6b23e,
    radius: 14,
  },
  champion: {
    id: 'champion',
    name: 'Champion',
    cost: 30,
    hp: 130,
    atk: 18,
    range: TILE_SIZE * 1.1,
    atkIntervalMs: 1100,
    color: 0xd6663e,
    radius: 16,
  },
  warlord: {
    id: 'warlord',
    name: 'Warlord',
    cost: 55,
    hp: 190,
    atk: 26,
    range: TILE_SIZE * 1.15,
    atkIntervalMs: 1050,
    color: 0x6a72d6,
    radius: 19,
  },
};

export const HERO_ORDER: HeroDefId[] = ['militia', 'archer', 'knight', 'champion', 'warlord'];

/** Warlord is a late-game elite tier — visible but unpurchasable until this wave. */
export const WARLORD_UNLOCK_WAVE = 5;

const ENEMY_BASE: Record<EnemyDefId, EnemyDef> = {
  grunt: {
    id: 'grunt',
    name: 'Grunt',
    hp: 20,
    atk: 4,
    speed: 42,
    atkIntervalMs: 1000,
    gold: 3,
    color: 0xb05a5a,
    radius: 10,
  },
  skirmisher: {
    id: 'skirmisher',
    name: 'Skirmisher',
    hp: 10,
    atk: 3,
    speed: 70,
    atkIntervalMs: 850,
    gold: 3,
    color: 0xe0a23e,
    radius: 7,
  },
  brute: {
    id: 'brute',
    name: 'Brute',
    hp: 70,
    atk: 10,
    speed: 22,
    atkIntervalMs: 1300,
    gold: 8,
    color: 0x7a3f5c,
    radius: 15,
  },
  reaver: {
    id: 'reaver',
    name: 'Reaver',
    hp: 45,
    atk: 15,
    speed: 38,
    atkIntervalMs: 950,
    gold: 10,
    color: 0xc9432e,
    radius: 12,
  },
  boss: {
    id: 'boss',
    name: 'The Ravager',
    hp: 1400,
    atk: 38,
    speed: 22,
    atkIntervalMs: 850,
    gold: 200,
    color: 0x4a1f4f,
    radius: 30,
  },
};

/** Scales an enemy's base stats up with the wave number so later waves hit harder. */
export function scaledEnemyDef(id: EnemyDefId, wave: number): EnemyDef {
  const base = ENEMY_BASE[id];
  const hpMult = 1 + 0.12 * (wave - 1);
  const atkMult = 1 + 0.08 * (wave - 1);
  return {
    ...base,
    hp: Math.round(base.hp * hpMult),
    atk: Math.round(base.atk * atkMult),
  };
}

export function waveClearBonus(wave: number): number {
  return 10 + wave * 4;
}
