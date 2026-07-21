import type { GameState } from './types.ts';
import { createScene } from './scene.ts';
import { createHud } from './hud.ts';
import { createBoonModal } from './boonModal.ts';
import { createInitialState, createHero, createEnemy } from './state.ts';
import { buildWaveSpawnQueue } from './waves.ts';
import { tickCombat } from './combat.ts';
import { rollBoons, applyBoon } from './boons.ts';
import { HERO_DEFS, TOTAL_WAVES, BOON_CHOICES_COUNT, waveClearBonus } from './config.ts';
import { isPlaceableTile, tileCenterPx, randomBorderSpawnPoint } from './grid.ts';

function heroCost(state: GameState, defId: keyof typeof HERO_DEFS): number {
  return Math.round(HERO_DEFS[defId].cost * state.runModifiers.heroCostMult);
}

export async function startGame(container: HTMLElement): Promise<void> {
  const boardEl = document.createElement('div');
  boardEl.className = 'board';
  const hudEl = document.createElement('div');
  hudEl.className = 'hud-container';
  container.appendChild(boardEl);
  container.appendChild(hudEl);

  const scene = await createScene(boardEl);
  const hud = createHud(hudEl);
  const boonModal = createBoonModal();

  let state: GameState = createInitialState();
  let hoverTile: { tx: number; ty: number } | null = null;

  function resetGame(): void {
    state = createInitialState();
    if (state.pendingBoonChoices) boonModal.show(state.pendingBoonChoices);
  }

  boonModal.onPick((boonId) => {
    const boon = state.pendingBoonChoices?.find((b) => b.id === boonId);
    if (!boon) return;
    applyBoon(state, boon);
    boonModal.hide();
  });

  if (state.pendingBoonChoices) {
    boonModal.show(state.pendingBoonChoices);
  }

  scene.onHover((tx, ty) => {
    hoverTile = tx !== null && ty !== null ? { tx, ty } : null;
  });

  scene.onTileClick((tx, ty) => {
    if (state.phase !== 'prep' || !state.selectedHeroDef || state.pendingBoonChoices) return;
    const cost = heroCost(state, state.selectedHeroDef);
    if (state.gold < cost) return;
    if (!isPlaceableTile(tx, ty)) return;

    const occupied = state.heroes.some((h) => {
      const c = tileCenterPx(tx, ty);
      return h.x === c.x && h.y === c.y;
    });
    if (occupied) return;

    const { x, y } = tileCenterPx(tx, ty);
    state.heroes.push(createHero(state, state.selectedHeroDef, x, y));
    state.gold -= cost;
  });

  hud.onSelectHero((defId) => {
    if (state.pendingBoonChoices) return;
    state.selectedHeroDef = state.selectedHeroDef === defId ? null : defId;
  });

  hud.onStartWave(() => {
    if (state.phase !== 'prep' || state.pendingBoonChoices) return;
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
          state.pendingBoonChoices = rollBoons(BOON_CHOICES_COUNT);
          boonModal.show(state.pendingBoonChoices);
        }
      }
    }

    scene.render(state, hoverTile);
    hud.update(state);
  });
}
