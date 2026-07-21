import type { Boon, GameState, HeroDefId, StatField } from './types.ts';

export function applyClassStat(state: GameState, cls: HeroDefId | 'all', field: StatField, mult: number): void {
  if (cls === 'all') {
    state.runModifiers.all[field] *= mult;
  } else {
    state.runModifiers.perClass[cls][field] *= mult;
  }

  for (const hero of state.heroes) {
    if (cls !== 'all' && hero.defId !== cls) continue;
    if (field === 'atk') {
      hero.atk = Math.round(hero.atk * mult);
    } else if (field === 'maxHp') {
      const ratio = hero.hp / hero.maxHp;
      hero.maxHp = Math.round(hero.maxHp * mult);
      hero.hp = Math.max(1, Math.round(hero.maxHp * ratio));
    } else if (field === 'atkSpeed') {
      hero.atkIntervalMs = Math.max(150, Math.round(hero.atkIntervalMs / mult));
    } else if (field === 'range') {
      hero.range = Math.round(hero.range * mult);
    }
  }
}

export const BOON_POOL: Boon[] = [
  {
    id: 'global-atk',
    name: 'Iron Discipline',
    description: '+10% ATK for all heroes.',
    apply: (state) => applyClassStat(state, 'all', 'atk', 1.1),
  },
  {
    id: 'global-hp',
    name: 'Battle Hardened',
    description: '+15% max HP for all heroes.',
    apply: (state) => applyClassStat(state, 'all', 'maxHp', 1.15),
  },
  {
    id: 'global-speed',
    name: 'Swift Strikes',
    description: '+12% attack speed for all heroes.',
    apply: (state) => applyClassStat(state, 'all', 'atkSpeed', 1.12),
  },
  {
    id: 'global-range',
    name: 'Extended Reach',
    description: '+10% range for all heroes.',
    apply: (state) => applyClassStat(state, 'all', 'range', 1.1),
  },
  {
    id: 'militia-atk',
    name: 'Militia Zeal',
    description: '+20% ATK for Militia.',
    apply: (state) => applyClassStat(state, 'militia', 'atk', 1.2),
  },
  {
    id: 'militia-hp',
    name: 'Militia Endurance',
    description: '+25% max HP for Militia.',
    apply: (state) => applyClassStat(state, 'militia', 'maxHp', 1.25),
  },
  {
    id: 'archer-speed',
    name: "Archer's Focus",
    description: '+20% attack speed for Archers.',
    apply: (state) => applyClassStat(state, 'archer', 'atkSpeed', 1.2),
  },
  {
    id: 'archer-range',
    name: 'Eagle Eye',
    description: '+25% range for Archers.',
    apply: (state) => applyClassStat(state, 'archer', 'range', 1.25),
  },
  {
    id: 'knight-hp',
    name: "Knight's Bulwark",
    description: '+25% max HP for Knights.',
    apply: (state) => applyClassStat(state, 'knight', 'maxHp', 1.25),
  },
  {
    id: 'knight-atk',
    name: "Knight's Resolve",
    description: '+15% ATK for Knights.',
    apply: (state) => applyClassStat(state, 'knight', 'atk', 1.15),
  },
  {
    id: 'champion-atk',
    name: "Champion's Might",
    description: '+20% ATK for Champions.',
    apply: (state) => applyClassStat(state, 'champion', 'atk', 1.2),
  },
  {
    id: 'champion-speed',
    name: "Champion's Fury",
    description: '+15% attack speed for Champions.',
    apply: (state) => applyClassStat(state, 'champion', 'atkSpeed', 1.15),
  },
  {
    id: 'gold-gain',
    name: "Prospector's Luck",
    description: '+20% gold from kills.',
    apply: (state) => {
      state.runModifiers.goldGainMult *= 1.2;
    },
  },
  {
    id: 'xp-gain',
    name: 'Battle Scholar',
    description: '+25% XP from kills.',
    apply: (state) => {
      state.runModifiers.xpGainMult *= 1.25;
    },
  },
  {
    id: 'cheap-heroes',
    name: 'Discount Recruiting',
    description: 'Hero placement costs -10%.',
    apply: (state) => {
      state.runModifiers.heroCostMult *= 0.9;
    },
  },
  {
    id: 'war-chest',
    name: 'War Chest',
    description: '+15 gold, right now.',
    apply: (state) => {
      state.gold += 15;
    },
  },
  {
    id: 'statue-hp',
    name: 'Sacred Ground',
    description: '+40 max HP for the statue, healed instantly.',
    apply: (state) => {
      state.statueMaxHp += 40;
      state.statueHp += 40;
    },
  },
  {
    id: 'statue-atk',
    name: 'Vengeful Stone',
    description: "+50% statue counter-attack damage.",
    apply: (state) => {
      state.runModifiers.statueAtkMult *= 1.5;
    },
  },
];

/** Draws `count` distinct random boons from the pool. Repeats across different rounds are allowed and stack. */
export function rollBoons(count: number): Boon[] {
  const pool = [...BOON_POOL];
  const picks: Boon[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

export function applyBoon(state: GameState, boon: Boon): void {
  boon.apply(state);
  state.pickedBoons.push(boon.name);
  state.pendingBoonChoices = null;
}
