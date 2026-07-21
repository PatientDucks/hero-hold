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

export const STARTING_GOLD = 30;

export const XP_PER_KILL = 8;
export const LEVEL_STAT_MULT = 1.15;
export const LEVEL_XP_MULT = 1.4;

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
};

export const HERO_ORDER: HeroDefId[] = ['militia', 'archer', 'knight', 'champion'];

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
  brute: {
    id: 'brute',
    name: 'Brute',
    hp: 55,
    atk: 9,
    speed: 30,
    atkIntervalMs: 1200,
    gold: 7,
    color: 0x7a3f5c,
    radius: 13,
  },
  boss: {
    id: 'boss',
    name: 'The Ravager',
    hp: 900,
    atk: 26,
    speed: 24,
    atkIntervalMs: 900,
    gold: 150,
    color: 0x4a1f4f,
    radius: 24,
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
