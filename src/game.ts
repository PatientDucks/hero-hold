import type { GameState } from './types.ts';
import { createScene } from './scene.ts';
import { createHud } from './hud.ts';
import { createBoonModal } from './boonModal.ts';
import { createInitialState, createHero, createEnemy } from './state.ts';
import { buildWaveSpawnQueue } from './waves.ts';
import { tickCombat } from './combat.ts';
import { rollBoons, applyBoon } from './boons.ts';
import { purchaseArmoryUpgrade, purchaseHeroUpgrade } from './upgrades.ts';
import { HERO_DEFS, TOTAL_WAVES, BOON_CHOICES_COUNT, WARLORD_UNLOCK_WAVE, waveClearBonus } from './config.ts';
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
    if (state.phase !== 'prep' || state.pendingBoonChoices) return;
    const { x, y } = tileCenterPx(tx, ty);
    const existingHero = state.heroes.find((h) => h.x === x && h.y === y);

    if (!state.selectedHeroDef) {
      // No hero type picked from the shop — clicking a placed hero opens its upgrade panel.
      state.selectedHeroUid = existingHero && existingHero.uid !== state.selectedHeroUid ? existingHero.uid : null;
      return;
    }

    if (existingHero || !isPlaceableTile(tx, ty)) return;
    if (state.selectedHeroDef === 'warlord' && state.wave < WARLORD_UNLOCK_WAVE) return;
    const cost = heroCost(state, state.selectedHeroDef);
    if (state.gold < cost) return;

    state.heroes.push(createHero(state, state.selectedHeroDef, x, y));
    state.gold -= cost;
  });

  hud.onSelectHero((defId) => {
    if (state.pendingBoonChoices) return;
    if (defId === 'warlord' && state.wave < WARLORD_UNLOCK_WAVE) return;
    state.selectedHeroDef = state.selectedHeroDef === defId ? null : defId;
    state.selectedHeroUid = null;
  });

  hud.onUpgradeHero((stat) => {
    const hero = state.heroes.find((h) => h.uid === state.selectedHeroUid);
    if (!hero) return;
    purchaseHeroUpgrade(state, hero, stat);
  });

  hud.onDeselectHero(() => {
    state.selectedHeroUid = null;
  });

  hud.onBuyArmory((id) => {
    if (state.pendingBoonChoices) return;
    purchaseArmoryUpgrade(state, id);
  });

  hud.onStartWave(() => {
    if (state.phase !== 'prep' || state.pendingBoonChoices) return;
    state.selectedHeroUid = null;
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
