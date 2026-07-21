import type { GameState, Hero, Enemy, HeroDefId, EnemyDefId } from './types.ts';
import { HERO_DEFS, STARTING_GOLD, STATUE_MAX_HP, scaledEnemyDef } from './config.ts';

export function createInitialState(): GameState {
  return {
    phase: 'prep',
    wave: 1,
    gold: STARTING_GOLD,
    statueHp: STATUE_MAX_HP,
    statueMaxHp: STATUE_MAX_HP,
    statueAtkCooldown: 0,
    heroes: [],
    enemies: [],
    spawnQueue: [],
    spawnTimer: 0,
    selectedHeroDef: null,
    nextUid: 1,
  };
}

export function createHero(state: GameState, defId: HeroDefId, x: number, y: number): Hero {
  const def = HERO_DEFS[defId];
  return {
    uid: state.nextUid++,
    defId,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    range: def.range,
    atkIntervalMs: def.atkIntervalMs,
    atkCooldown: 0,
    level: 1,
    xp: 0,
    xpToNext: 20,
  };
}

export function createEnemy(state: GameState, defId: EnemyDefId, wave: number, x: number, y: number): Enemy {
  const def = scaledEnemyDef(defId, wave);
  return {
    uid: state.nextUid++,
    defId,
    x,
    y,
    hp: def.hp,
    maxHp: def.hp,
    atk: def.atk,
    speed: def.speed,
    atkIntervalMs: def.atkIntervalMs,
    atkCooldown: 0,
    gold: def.gold,
    engagedHeroUid: null,
    atStatue: false,
  };
}
