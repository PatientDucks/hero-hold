/**
 * Headless balance simulator. Runs full 10-wave games using naive/"mindless"
 * play strategies (and one deliberately competent baseline for contrast) to
 * check that low-effort play doesn't reliably win. No Pixi/DOM involved —
 * this drives the same state/combat/waves/boons/upgrades modules the real
 * game uses, just without rendering.
 *
 * Usage: npm run simulate [-- --trials=300]
 */
import type { Boon, GameState, HeroDefId } from '../src/types.ts';
import { createInitialState, createHero, createEnemy } from '../src/state.ts';
import { buildWaveSpawnQueue } from '../src/waves.ts';
import { tickCombat } from '../src/combat.ts';
import { applyBoon, rollBoons } from '../src/boons.ts';
import { purchaseArmoryUpgrade, purchaseHeroUpgrade, ARMORY_ORDER } from '../src/upgrades.ts';
import {
  HERO_DEFS,
  HERO_ORDER,
  GRID_SIZE,
  TOTAL_WAVES,
  WARLORD_UNLOCK_WAVE,
  BOON_CHOICES_COUNT,
  waveClearBonus,
} from '../src/config.ts';
import { isPlaceableTile, tileCenterPx, randomBorderSpawnPoint } from '../src/grid.ts';

const SIM_STEP_MS = 40;
const MAX_SIM_MS = 20 * 60 * 1000; // 20 simulated minutes safety cap per run

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function allPlaceableTiles(): Array<[number, number]> {
  const tiles: Array<[number, number]> = [];
  for (let tx = 0; tx < GRID_SIZE; tx++) {
    for (let ty = 0; ty < GRID_SIZE; ty++) {
      if (isPlaceableTile(tx, ty)) tiles.push([tx, ty]);
    }
  }
  return tiles;
}

function unlockedHeroDefs(state: GameState): HeroDefId[] {
  return HERO_ORDER.filter((id) => id !== 'warlord' || state.wave >= WARLORD_UNLOCK_WAVE);
}

function heroCost(state: GameState, defId: HeroDefId): number {
  return Math.round(HERO_DEFS[defId].cost * state.runModifiers.heroCostMult);
}

function tryPlace(state: GameState, defId: HeroDefId, tx: number, ty: number): boolean {
  const { x, y } = tileCenterPx(tx, ty);
  if (state.heroes.some((h) => h.x === x && h.y === y)) return false;
  const cost = heroCost(state, defId);
  if (state.gold < cost) return false;
  state.heroes.push(createHero(state, defId, x, y));
  state.gold -= cost;
  return true;
}

interface Strategy {
  name: string;
  pickBoon: (state: GameState, choices: Boon[]) => Boon;
  prepPhase: (state: GameState) => void;
}

// Ring of tiles immediately surrounding the statue — the sane place to wall it off.
const CENTER_TILE_IDX = Math.floor(GRID_SIZE / 2);
const RING_TILES: Array<[number, number]> = [];
for (let dx = -1; dx <= 1; dx++) {
  for (let dy = -1; dy <= 1; dy++) {
    if (dx === 0 && dy === 0) continue;
    RING_TILES.push([CENTER_TILE_IDX + dx, CENTER_TILE_IDX + dy]);
  }
}

const strategies: Strategy[] = [
  {
    name: 'mindless-spam-militia',
    pickBoon: (_state, choices) => choices[0],
    prepPhase: (state) => {
      for (const [tx, ty] of shuffle(allPlaceableTiles())) {
        if (!tryPlace(state, 'militia', tx, ty)) continue;
      }
    },
  },
  {
    name: 'mindless-random-everything',
    pickBoon: (_state, choices) => choices[Math.floor(Math.random() * choices.length)],
    prepPhase: (state) => {
      const tiles = shuffle(allPlaceableTiles());
      let attempts = 0;
      for (const [tx, ty] of tiles) {
        if (attempts++ > 80) break;
        const defs = unlockedHeroDefs(state);
        const defId = defs[Math.floor(Math.random() * defs.length)];
        tryPlace(state, defId, tx, ty);
      }
      // Spend leftover gold on random armory upgrades without regard to value.
      for (let i = 0; i < 4; i++) {
        const id = ARMORY_ORDER[Math.floor(Math.random() * ARMORY_ORDER.length)];
        purchaseArmoryUpgrade(state, id);
      }
    },
  },
  {
    name: 'competent-baseline',
    pickBoon: (state, choices) => {
      // Prefer broad combat multipliers; fall back to whatever's offered.
      const scored = choices
        .map((b) => {
          let score = 0;
          if (b.id.startsWith('global-')) score = 3;
          else if (state.heroes.some((h) => b.id.startsWith(h.defId))) score = 2;
          else if (b.id.startsWith('statue-')) score = 1;
          return { b, score };
        })
        .sort((a, c) => c.score - a.score);
      return scored[0].b;
    },
    prepPhase: (state) => {
      // Coverage first: cheap chokepoint bodies on every ring tile before splurging on
      // any single expensive unit — an empty gap in the ring is worse than a weak body in it.
      for (const [tx, ty] of RING_TILES) {
        tryPlace(state, 'militia', tx, ty);
      }
      // Archers one ring further out for extra DPS once the chokepoint is covered.
      const outerRing = shuffle(
        allPlaceableTiles().filter(([tx, ty]) => {
          const d = Math.max(Math.abs(tx - CENTER_TILE_IDX), Math.abs(ty - CENTER_TILE_IDX));
          return d === 2;
        }),
      );
      for (const [tx, ty] of outerRing) {
        tryPlace(state, 'archer', tx, ty);
      }
      // Any further leftover gold: reinforce existing heroes' HP directly (a couple
      // purchases per hero, cost grows fast enough to naturally cap this).
      for (const hero of shuffle(state.heroes)) {
        for (let i = 0; i < 3; i++) {
          if (!purchaseHeroUpgrade(state, hero, 'maxHp')) break;
        }
      }
      // Whatever's left over: combat-relevant armory upgrades.
      for (let i = 0; i < 6; i++) {
        if (!purchaseArmoryUpgrade(state, 'whetstones') && !purchaseArmoryUpgrade(state, 'plating')) break;
      }
    },
  },
];

interface RunResult {
  result: 'won' | 'lost' | 'stuck';
  waveReached: number;
}

function simulateRun(strategy: Strategy): RunResult {
  const state = createInitialState();
  if (state.pendingBoonChoices) {
    applyBoon(state, strategy.pickBoon(state, state.pendingBoonChoices));
  }

  let simMs = 0;
  while (state.phase !== 'won' && state.phase !== 'lost') {
    if (simMs > MAX_SIM_MS) return { result: 'stuck', waveReached: state.wave };

    if (state.phase === 'prep') {
      strategy.prepPhase(state);
      state.spawnQueue = buildWaveSpawnQueue(state.wave);
      state.spawnTimer = state.spawnQueue.length > 0 ? state.spawnQueue[0].delayMs : 0;
      state.phase = 'combat';
      continue;
    }

    // combat phase
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= SIM_STEP_MS;
      while (state.spawnQueue.length > 0 && state.spawnTimer <= 0) {
        const entry = state.spawnQueue.shift()!;
        const spawn = randomBorderSpawnPoint();
        state.enemies.push(createEnemy(state, entry.defId, state.wave, spawn.x, spawn.y));
        state.spawnTimer += state.spawnQueue.length > 0 ? state.spawnQueue[0].delayMs : 0;
      }
    }
    tickCombat(state, SIM_STEP_MS);
    simMs += SIM_STEP_MS;

    if (state.statueHp <= 0) {
      state.statueHp = 0;
      state.phase = 'lost';
    } else if (state.spawnQueue.length === 0 && state.enemies.length === 0) {
      state.gold += waveClearBonus(state.wave);
      if (state.wave >= TOTAL_WAVES) {
        state.phase = 'won';
      } else {
        state.wave += 1;
        state.phase = 'prep';
        state.pendingBoonChoices = rollBoons(BOON_CHOICES_COUNT);
        applyBoon(state, strategy.pickBoon(state, state.pendingBoonChoices));
      }
    }
  }

  return { result: state.phase as 'won' | 'lost', waveReached: state.wave };
}

function main(): void {
  const trialsArg = process.argv.find((a) => a.startsWith('--trials='));
  const trials = trialsArg ? Number(trialsArg.split('=')[1]) : 200;

  for (const strategy of strategies) {
    let wins = 0;
    let stuck = 0;
    const lossWaves: number[] = [];
    for (let i = 0; i < trials; i++) {
      const r = simulateRun(strategy);
      if (r.result === 'won') wins++;
      else if (r.result === 'stuck') stuck++;
      else lossWaves.push(r.waveReached);
    }
    const winRate = ((wins / trials) * 100).toFixed(1);
    const avgLossWave = lossWaves.length > 0 ? (lossWaves.reduce((a, b) => a + b, 0) / lossWaves.length).toFixed(1) : 'n/a';
    console.log(`\n${strategy.name}  win%=${winRate}  avgLossWave=${avgLossWave}  stuck=${stuck}  (n=${trials})`);

    const histogram = new Array<number>(TOTAL_WAVES + 1).fill(0);
    for (const w of lossWaves) histogram[w] = (histogram[w] ?? 0) + 1;
    for (let w = 1; w <= TOTAL_WAVES; w++) {
      if (histogram[w] === 0) continue;
      const bar = '#'.repeat(Math.round((histogram[w] / trials) * 60));
      console.log(`  died wave ${String(w).padStart(2)}: ${String(histogram[w]).padStart(4)}  ${bar}`);
    }
  }
}

main();
