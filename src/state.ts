import type { GameState, Hero, Enemy, HeroDefId, EnemyDefId, RunModifiers, StatMultipliers } from './types.ts';
import { HERO_DEFS, STARTING_GOLD, STATUE_MAX_HP, BOON_CHOICES_COUNT, scaledEnemyDef } from './config.ts';
import { rollBoons } from './boons.ts';

function defaultStatMultipliers(): StatMultipliers {
  return { atk: 1, maxHp: 1, atkSpeed: 1, range: 1 };
}

function defaultRunModifiers(): RunModifiers {
  return {
    all: defaultStatMultipliers(),
    perClass: {
      militia: defaultStatMultipliers(),
      archer: defaultStatMultipliers(),
      knight: defaultStatMultipliers(),
      champion: defaultStatMultipliers(),
    },
    goldGainMult: 1,
    xpGainMult: 1,
    heroCostMult: 1,
    statueAtkMult: 1,
  };
}

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
    runModifiers: defaultRunModifiers(),
    floatingTexts: [],
    pendingBoonChoices: rollBoons(BOON_CHOICES_COUNT),
    pickedBoons: [],
  };
}

export function createHero(state: GameState, defId: HeroDefId, x: number, y: number): Hero {
  const def = HERO_DEFS[defId];
  const mods = state.runModifiers;
  const cm = mods.perClass[defId];
  const atk = Math.round(def.atk * mods.all.atk * cm.atk);
  const maxHp = Math.round(def.hp * mods.all.maxHp * cm.maxHp);
  const atkIntervalMs = Math.max(150, Math.round(def.atkIntervalMs / (mods.all.atkSpeed * cm.atkSpeed)));
  const range = Math.round(def.range * mods.all.range * cm.range);
  return {
    uid: state.nextUid++,
    defId,
    x,
    y,
    hp: maxHp,
    maxHp,
    atk,
    range,
    atkIntervalMs,
    atkCooldown: 0,
    level: 1,
    xp: 0,
    xpToNext: 20,
    levelFlashRemaining: 0,
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
