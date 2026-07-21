import type { GameState } from './types.ts';
import { createScene } from './scene.ts';
import { createHud } from './hud.ts';
import { createInitialState, createHero, createEnemy } from './state.ts';
import { buildWaveSpawnQueue } from './waves.ts';
import { tickCombat } from './combat.ts';
import { HERO_DEFS, TOTAL_WAVES, waveClearBonus } from './config.ts';
import { isPlaceableTile, tileCenterPx, randomBorderSpawnPoint } from './grid.ts';

export async function startGame(container: HTMLElement): Promise<void> {
  const boardEl = document.createElement('div');
  boardEl.className = 'board';
  const hudEl = document.createElement('div');
  hudEl.className = 'hud-container';
  container.appendChild(boardEl);
  container.appendChild(hudEl);

  const scene = await createScene(boardEl);
  const hud = createHud(hudEl);

  let state: GameState = createInitialState();
  let hoverTile: { tx: number; ty: number } | null = null;

  function resetGame(): void {
    state = createInitialState();
  }

  scene.onHover((tx, ty) => {
    hoverTile = tx !== null && ty !== null ? { tx, ty } : null;
  });

  scene.onTileClick((tx, ty) => {
    if (state.phase !== 'prep' || !state.selectedHeroDef) return;
    const def = HERO_DEFS[state.selectedHeroDef];
    if (state.gold < def.cost) return;
    if (!isPlaceableTile(tx, ty)) return;

    const occupied = state.heroes.some((h) => {
      const c = tileCenterPx(tx, ty);
      return h.x === c.x && h.y === c.y;
    });
    if (occupied) return;

    const { x, y } = tileCenterPx(tx, ty);
    state.heroes.push(createHero(state, state.selectedHeroDef, x, y));
    state.gold -= def.cost;
  });

  hud.onSelectHero((defId) => {
    state.selectedHeroDef = state.selectedHeroDef === defId ? null : defId;
  });

  hud.onStartWave(() => {
    if (state.phase !== 'prep') return;
    state.spawnQueue = buildWaveSpawnQueue(state.wave);
    state.spawnTimer = state.spawnQueue.length > 0 ? state.spawnQueue[0].delayMs : 0;
    state.phase = 'combat';
  });

  hud.onRestart(() => {
    resetGame();
  });

  function processSpawns(deltaMs: number): void {
    if (state.spawnQueue.length === 0) return;
    state.spawnTimer -= deltaMs;
    while (state.spawnQueue.length > 0 && state.spawnTimer <= 0) {
      const entry = state.spawnQueue.shift()!;
      const spawn = randomBorderSpawnPoint();
      state.enemies.push(createEnemy(state, entry.defId, state.wave, spawn.x, spawn.y));
      state.spawnTimer += state.spawnQueue.length > 0 ? state.spawnQueue[0].delayMs : 0;
    }
  }

  scene.app.ticker.add(() => {
    const deltaMs = scene.app.ticker.deltaMS;

    if (state.phase === 'combat') {
      processSpawns(deltaMs);
      tickCombat(state, deltaMs);

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
        }
      }
    }

    scene.render(state, hoverTile);
    hud.update(state);
  });
}
