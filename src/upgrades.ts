import type { ArmoryUpgradeId, GameState, Hero, HeroUpgradeStat } from './types.ts';
import { applyClassStat } from './boons.ts';

interface HeroUpgradeDef {
  label: string;
  baseCost: number;
  costGrowth: number;
  stepMult: number; // multiplier applied to the stat per purchase
}

export const HERO_UPGRADE_DEFS: Record<HeroUpgradeStat, HeroUpgradeDef> = {
  atk: { label: 'ATK', baseCost: 8, costGrowth: 1.5, stepMult: 1.1 },
  maxHp: { label: 'HP', baseCost: 8, costGrowth: 1.5, stepMult: 1.1 },
  atkSpeed: { label: 'Speed', baseCost: 10, costGrowth: 1.5, stepMult: 1.08 },
};

export function heroUpgradeCost(hero: Hero, stat: HeroUpgradeStat): number {
  const def = HERO_UPGRADE_DEFS[stat];
  return Math.round(def.baseCost * Math.pow(def.costGrowth, hero.upgrades[stat]));
}

/** Spends gold to permanently boost one stat on a single placed hero. Returns whether the purchase happened. */
export function purchaseHeroUpgrade(state: GameState, hero: Hero, stat: HeroUpgradeStat): boolean {
  const cost = heroUpgradeCost(hero, stat);
  if (state.gold < cost) return false;
  state.gold -= cost;

  const def = HERO_UPGRADE_DEFS[stat];
  if (stat === 'atk') {
    hero.atk = Math.round(hero.atk * def.stepMult);
  } else if (stat === 'maxHp') {
    const ratio = hero.hp / hero.maxHp;
    hero.maxHp = Math.round(hero.maxHp * def.stepMult);
    hero.hp = Math.max(1, Math.round(hero.maxHp * ratio));
  } else if (stat === 'atkSpeed') {
    hero.atkIntervalMs = Math.max(150, Math.round(hero.atkIntervalMs / def.stepMult));
  }
  hero.upgrades[stat] += 1;
  return true;
}

interface ArmoryDef {
  name: string;
  effectLabel: string;
  baseCost: number;
  costGrowth: number;
  apply: (state: GameState) => void;
}

export const ARMORY_DEFS: Record<ArmoryUpgradeId, ArmoryDef> = {
  whetstones: {
    name: 'Whetstones',
    effectLabel: '+4% ATK, all heroes',
    baseCost: 20,
    costGrowth: 1.6,
    apply: (state) => applyClassStat(state, 'all', 'atk', 1.04),
  },
  plating: {
    name: 'Reinforced Plating',
    effectLabel: '+5% max HP, all heroes',
    baseCost: 20,
    costGrowth: 1.6,
    apply: (state) => applyClassStat(state, 'all', 'maxHp', 1.05),
  },
  quartermaster: {
    name: 'Quartermaster',
    effectLabel: '-3% hero cost',
    baseCost: 25,
    costGrowth: 1.6,
    apply: (state) => {
      state.runModifiers.heroCostMult = Math.max(0.4, state.runModifiers.heroCostMult * 0.97);
    },
  },
  warchest: {
    name: "War Chest Tithe",
    effectLabel: '+8% gold from kills',
    baseCost: 25,
    costGrowth: 1.6,
    apply: (state) => {
      state.runModifiers.goldGainMult *= 1.08;
    },
  },
};

export const ARMORY_ORDER: ArmoryUpgradeId[] = ['whetstones', 'plating', 'quartermaster', 'warchest'];

export function armoryUpgradeCost(state: GameState, id: ArmoryUpgradeId): number {
  const def = ARMORY_DEFS[id];
  return Math.round(def.baseCost * Math.pow(def.costGrowth, state.armoryLevels[id]));
}

/** Spends gold on a permanent, repeatable global upgrade. Returns whether the purchase happened. */
export function purchaseArmoryUpgrade(state: GameState, id: ArmoryUpgradeId): boolean {
  const cost = armoryUpgradeCost(state, id);
  if (state.gold < cost) return false;
  state.gold -= cost;
  ARMORY_DEFS[id].apply(state);
  state.armoryLevels[id] += 1;
  return true;
}
