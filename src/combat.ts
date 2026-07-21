import type { GameState, Hero, Enemy } from './types.ts';
import {
  CENTER_PX,
  STATUE_ENGAGE_RADIUS,
  HERO_ENGAGE_RADIUS,
  XP_PER_KILL,
  LEVEL_STAT_MULT,
  LEVEL_XP_MULT,
} from './config.ts';

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function nearestAliveHero(x: number, y: number, heroes: Hero[], maxRange: number): Hero | null {
  let best: Hero | null = null;
  let bestDist = maxRange;
  for (const hero of heroes) {
    if (hero.hp <= 0) continue;
    const d = dist(x, y, hero.x, hero.y);
    if (d <= bestDist) {
      best = hero;
      bestDist = d;
    }
  }
  return best;
}

function nearestAliveEnemy(x: number, y: number, enemies: Enemy[], maxRange: number): Enemy | null {
  let best: Enemy | null = null;
  let bestDist = maxRange;
  for (const enemy of enemies) {
    if (enemy.hp <= 0) continue;
    const d = dist(x, y, enemy.x, enemy.y);
    if (d <= bestDist) {
      best = enemy;
      bestDist = d;
    }
  }
  return best;
}

function grantXp(hero: Hero, amount: number): void {
  hero.xp += amount;
  while (hero.xp >= hero.xpToNext) {
    hero.xp -= hero.xpToNext;
    hero.level += 1;
    hero.maxHp = Math.round(hero.maxHp * LEVEL_STAT_MULT);
    hero.atk = Math.round(hero.atk * LEVEL_STAT_MULT);
    hero.hp = hero.maxHp;
    hero.xpToNext = Math.round(hero.xpToNext * LEVEL_XP_MULT);
  }
}

export interface CombatEvents {
  goldEarned: number;
  statueDamaged: boolean;
  enemyKills: number;
}

/** Advances the battle simulation by deltaMs: enemy movement/engagement, hero attacks, statue damage. Mutates state in place. */
export function tickCombat(state: GameState, deltaMs: number): CombatEvents {
  const events: CombatEvents = { goldEarned: 0, statueDamaged: false, enemyKills: 0 };
  const dt = deltaMs / 1000;

  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;

    const engagedHero =
      enemy.engagedHeroUid !== null ? state.heroes.find((h) => h.uid === enemy.engagedHeroUid && h.hp > 0) : undefined;

    const targetHero = engagedHero ?? nearestAliveHero(enemy.x, enemy.y, state.heroes, HERO_ENGAGE_RADIUS);

    if (targetHero) {
      enemy.engagedHeroUid = targetHero.uid;
      enemy.atStatue = false;
      enemy.atkCooldown -= deltaMs;
      if (enemy.atkCooldown <= 0) {
        targetHero.hp -= enemy.atk;
        enemy.atkCooldown = enemy.atkIntervalMs;
      }
      continue;
    }

    enemy.engagedHeroUid = null;

    const distToCenter = dist(enemy.x, enemy.y, CENTER_PX, CENTER_PX);
    if (distToCenter <= STATUE_ENGAGE_RADIUS) {
      enemy.atStatue = true;
      enemy.atkCooldown -= deltaMs;
      if (enemy.atkCooldown <= 0) {
        state.statueHp -= enemy.atk;
        events.statueDamaged = true;
        enemy.atkCooldown = enemy.atkIntervalMs;
      }
      continue;
    }

    enemy.atStatue = false;
    const dx = CENTER_PX - enemy.x;
    const dy = CENTER_PX - enemy.y;
    const len = Math.hypot(dx, dy) || 1;
    enemy.x += (dx / len) * enemy.speed * dt;
    enemy.y += (dy / len) * enemy.speed * dt;
  }

  for (const hero of state.heroes) {
    if (hero.hp <= 0) continue;
    hero.atkCooldown -= deltaMs;
    if (hero.atkCooldown > 0) continue;

    const target = nearestAliveEnemy(hero.x, hero.y, state.enemies, hero.range);
    if (!target) continue;

    target.hp -= hero.atk;
    hero.atkCooldown = hero.atkIntervalMs;

    if (target.hp <= 0) {
      events.goldEarned += target.gold;
      events.enemyKills += 1;
      grantXp(hero, XP_PER_KILL);
    }
  }

  state.heroes = state.heroes.filter((h) => h.hp > 0);
  state.enemies = state.enemies.filter((e) => e.hp > 0);
  state.gold += events.goldEarned;

  return events;
}
